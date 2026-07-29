import { randomInt, randomUUID } from "node:crypto";

import { AccountDeletionSideEffectInvocationState, AccountDeletionStage, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient, getSupabaseAdminProviderIdentity } from "@/lib/supabase/admin";
import { vehicleImagesBucket } from "@/lib/vehicle-images";
import {
  AccountDeletionCompletedEmailError,
  AccountDeletionCompletedEmailPayload,
  createAccountDeletionCompletedEmailPayload,
  sendAccountDeletionCompletedEmail,
  sendAccountDeletionVerificationEmail,
} from "@/lib/account-deletion-email";
import {
  AccountDeletionError,
  accountDeletionHash,
  createAccountDeletionReceipt,
  equalAccountDeletionHash,
} from "@/lib/mobile-account-deletion-contract";
import {
  decryptAccountDeletionValue,
  encryptAccountDeletionValue,
} from "@/lib/account-deletion-crypto";

const verificationLifetimeMs = 10 * 60 * 1000;
// The cancellation window is server-owned so clients never infer a deletion
// deadline from local time or a retry schedule.
export const accountDeletionGracePeriodMs = 7 * 24 * 60 * 60 * 1000;
const resendCooldownMs = 60 * 1000;
const maxResends = 3;
const maxVerificationAttempts = 5;
const leaseLifetimeMs = 60 * 1000;
const receiptRetentionMs = 7 * 24 * 60 * 60 * 1000;
const receiptStatusWindowMs = 60 * 1000;
const receiptStatusMaxRequests = 20;
const receiptStatusMaxEntries = 1_000;
// Resend keeps an idempotency key for 24 hours. Stop one hour earlier rather
// than allowing an uncertain retry to become a second logical delivery.
const completionEmailRetryWindowMs = 23 * 60 * 60 * 1000;
type ReceiptStatusAttempt = {
  count: number;
  expiresAt: number;
  previous: string | null;
  next: string | null;
};

// A linked expiry queue keeps cleanup O(1) per expired record. Receipt hashes,
// never raw receipts, are the only keys retained in process memory.
const receiptStatusAttempts = new Map<string, ReceiptStatusAttempt>();
let receiptStatusExpiryHead: string | null = null;
let receiptStatusExpiryTail: string | null = null;
let receiptStatusLastCleanupWork = 0;

type WorkerRequest = Awaited<ReturnType<typeof prisma.accountDeletionRequest.findUnique>>;
type DeletionClock = () => Date;
type WorkerLease = { id: string; operationVersion: number };

type AccountDeletionWorkerHooks = Partial<Record<
    "beforeStorage" | "beforeDatabase" | "beforeAuth" | "beforeCompletion" | "beforeCompletionEmail" |
    "afterStorageReservationBeforeAdapter" | "afterAuthReservationBeforeAdapter" | "afterCompletionEmailReservationBeforeAdapter" |
    "afterStorageInvocationBeforeAdapter" | "afterAuthInvocationBeforeAdapter" | "afterCompletionEmailInvocationBeforeAdapter" |
    "afterCompletionEmailAdapterBeforeSuccessCommit" | "afterDatabaseCommitMarkerBeforePurge",
  () => void | Promise<void>
>>;

export type AccountDeletionWorkerOptions = {
  limit?: number;
  /** Internal deterministic clock used by the disposable PostgreSQL harness. */
  clock?: DeletionClock;
  /** Internal phase barriers used only by the disposable PostgreSQL harness. */
  hooks?: AccountDeletionWorkerHooks;
};

export async function startAccountDeletionVerification(input: { authUserId: string; email: string }) {
  const authUserIdHash = accountDeletionHash(input.authUserId);
  const authProviderIdentity = getSupabaseAdminProviderIdentity();
  if (!authProviderIdentity) throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
  const now = new Date();
  const existing = await prisma.accountDeletionRequest.findUnique({ where: { authUserIdHash } });

  if (existing && existing.stage !== "VERIFICATION_PENDING" && existing.stage !== "CANCELLED") {
    throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  }
  if (existing?.legalHold) throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  if (existing?.stage !== "CANCELLED" && existing?.lastSentAt && now.getTime() - existing.lastSentAt.getTime() < resendCooldownMs) {
    throw new AccountDeletionError("ACCOUNT_DELETION_VERIFICATION_LIMITED");
  }
  if (existing && existing.stage !== "CANCELLED" && existing.resendCount >= maxResends) throw new AccountDeletionError("ACCOUNT_DELETION_VERIFICATION_LIMITED");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const receipt = createAccountDeletionReceipt();
  const common = {
    verificationHash: accountDeletionHash(`${input.authUserId}:${code}`),
    verificationExpiresAt: new Date(now.getTime() + verificationLifetimeMs),
    verificationAttempts: 0,
    lastSentAt: now,
    safeErrorCode: null,
    operationReceiptHash: accountDeletionHash(receipt),
    encryptedAuthUserId: encryptAccountDeletionValue(input.authUserId),
    encryptedEmail: encryptAccountDeletionValue(input.email),
    authProviderIdentity,
  };

  if (existing) {
    const restartingCancelledRequest = existing.stage === "CANCELLED";
    const updated = await prisma.accountDeletionRequest.updateMany({
      where: {
        id: existing.id,
        stage: restartingCancelledRequest ? "CANCELLED" : "VERIFICATION_PENDING",
        legalHold: false,
        ...(restartingCancelledRequest ? {} : { resendCount: { lt: maxResends } }),
      },
      data: {
        ...common,
        stage: "VERIFICATION_PENDING",
        resendCount: restartingCancelledRequest ? 1 : { increment: 1 },
        idempotencyKeyHash: null,
        scheduledDeletionAt: null,
        cancelledAt: null,
        nextAttemptAt: null,
        purgeAfter: null,
        operationVersion: { increment: 1 },
      },
    });
    if (!updated.count) throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  } else {
    try {
      await prisma.accountDeletionRequest.create({
        data: { authUserIdHash, ...common, resendCount: 1 },
      });
    } catch {
      // A concurrent verification request won the unique auth-user claim.
      throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
    }
  }

  try {
    await sendAccountDeletionVerificationEmail({ to: input.email, code });
  } catch {
    await prisma.accountDeletionRequest.updateMany({
      where: { authUserIdHash, stage: "VERIFICATION_PENDING" },
      data: { safeErrorCode: "EMAIL_DELIVERY_FAILED" },
    });
    throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
  }

  // This is the only response that exposes the opaque recovery receipt. No
  // destructive work has started yet, so a lost response is safe to resend.
  return { data: { status: "verification_sent" as const, receipt } };
}

export async function confirmAccountDeletion(input: {
  authUserId: string;
  verificationCode: string;
  idempotencyKey: string;
  /** Internal deterministic clock used only by the disposable PostgreSQL harness. */
  clock?: DeletionClock;
}) {
  const authUserIdHash = accountDeletionHash(input.authUserId);
  const idempotencyKeyHash = accountDeletionHash(input.idempotencyKey);
  const now = input.clock?.() ?? new Date();
  const request = await prisma.accountDeletionRequest.findUnique({ where: { authUserIdHash } });
  if (!request) throw new AccountDeletionError("ACCOUNT_DELETION_NOT_READY");
  if (request.legalHold || request.stage === "FAILED_FINAL") throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  if (request.stage === "COMPLETED") return { data: { status: "completed" as const } };

  if (request.idempotencyKeyHash) {
    if (request.idempotencyKeyHash !== idempotencyKeyHash) throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
    return { data: { status: "pending" as const } };
  }
  if (!request.verificationHash || !request.verificationExpiresAt || request.stage !== "VERIFICATION_PENDING") {
    throw new AccountDeletionError("ACCOUNT_DELETION_NOT_READY");
  }
  if (request.verificationAttempts >= maxVerificationAttempts || request.verificationExpiresAt <= now) {
    throw new AccountDeletionError("ACCOUNT_DELETION_VERIFICATION_INVALID");
  }
  if (!equalAccountDeletionHash(request.verificationHash, `${input.authUserId}:${input.verificationCode}`)) {
    await prisma.accountDeletionRequest.updateMany({
      where: { id: request.id, stage: "VERIFICATION_PENDING", legalHold: false, verificationAttempts: { lt: maxVerificationAttempts } },
      data: { verificationAttempts: { increment: 1 } },
    });
    throw new AccountDeletionError("ACCOUNT_DELETION_VERIFICATION_INVALID");
  }

  // Compare-and-set means a second instance cannot overwrite this operation
  // with another idempotency key or execute the external deletion steps.
  const scheduledDeletionAt = new Date(now.getTime() + accountDeletionGracePeriodMs);
  const started = await prisma.accountDeletionRequest.updateMany({
    where: {
      id: request.id,
      stage: "VERIFICATION_PENDING",
      idempotencyKeyHash: null,
      legalHold: false,
      verificationHash: request.verificationHash,
      verificationExpiresAt: { gt: now },
    },
    data: {
      stage: "VERIFIED",
      idempotencyKeyHash,
      verificationHash: null,
      verificationExpiresAt: null,
      safeErrorCode: null,
      scheduledDeletionAt,
      nextAttemptAt: scheduledDeletionAt,
      operationVersion: { increment: 1 },
    },
  });
  if (!started.count) {
    const current = await prisma.accountDeletionRequest.findUnique({ where: { id: request.id }, select: { idempotencyKeyHash: true } });
    if (current?.idempotencyKeyHash === idempotencyKeyHash) return { data: { status: "pending" as const } };
    throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  }

  return { data: { status: "pending" as const } };
}

export async function cancelAccountDeletion(input: { authUserId: string; clock?: DeletionClock }) {
  const now = input.clock?.() ?? new Date();
  const authUserIdHash = accountDeletionHash(input.authUserId);
  const request = await prisma.accountDeletionRequest.findUnique({
    where: { authUserIdHash },
    select: { id: true, stage: true },
  });
  if (!request) throw new AccountDeletionError("ACCOUNT_DELETION_NOT_CANCELLABLE");
  if (request.stage === "CANCELLED") return { data: { status: "cancelled" as const } };

  // A cancellation may win only before the server-side deadline and before a
  // worker has a lease or any irreversible phase has started.
  const cancelled = await prisma.accountDeletionRequest.updateMany({
    where: {
      id: request.id,
      stage: "VERIFIED",
      legalHold: false,
      scheduledDeletionAt: { gt: now },
      executionLeaseId: null,
      executionLeaseExpiresAt: null,
      storageCompletedAt: null,
      databaseCompletedAt: null,
      authCompletedAt: null,
    },
    data: {
      stage: "CANCELLED",
      cancelledAt: now,
      scheduledDeletionAt: null,
      nextAttemptAt: null,
      verificationHash: null,
      verificationExpiresAt: null,
      encryptedAuthUserId: null,
      encryptedEmail: null,
      safeErrorCode: null,
      purgeAfter: new Date(now.getTime() + receiptRetentionMs),
      operationVersion: { increment: 1 },
    },
  });
  if (cancelled.count) return { data: { status: "cancelled" as const } };

  const current = await prisma.accountDeletionRequest.findUnique({ where: { id: request.id }, select: { stage: true } });
  if (current?.stage === "CANCELLED") return { data: { status: "cancelled" as const } };
  throw new AccountDeletionError("ACCOUNT_DELETION_NOT_CANCELLABLE");
}

export async function getAccountDeletionStatusByReceipt(
  receipt: string,
  options: { includeSchedule?: boolean; contractVersion?: "account-deletion-v2" | "account-deletion-v3" } = {},
) {
  const receiptHash = accountDeletionHash(receipt);
  limitReceiptStatusLookup(receiptHash);
  const request = await prisma.accountDeletionRequest.findUnique({
    where: { operationReceiptHash: receiptHash },
    select: { stage: true, legalHold: true, scheduledDeletionAt: true, updatedAt: true },
  });
  if (!request) throw new AccountDeletionError("ACCOUNT_DELETION_STATUS_UNAVAILABLE");
  const status = request.legalHold
    ? "blocked" as const
    : request.stage === "COMPLETED"
      ? "completed" as const
      : request.stage === "FAILED_FINAL"
        ? "failed_final" as const
        : request.stage === "CANCELLED"
          ? "cancelled" as const
          : request.stage === "VERIFICATION_PENDING" && options.contractVersion === "account-deletion-v3"
            ? "verification_pending" as const
          : "pending" as const;
  if (!options.includeSchedule) {
    // Existing strict mobile v1 parsers accept only this exact object.
    return { data: { status: status === "cancelled" ? "failed_final" as const : status } };
  }
  return {
    data: {
      status,
      scheduledDeletionAt: status === "pending" && request.scheduledDeletionAt
        ? request.scheduledDeletionAt.toISOString()
        : null,
    },
  };
}

function limitReceiptStatusLookup(receiptHash: string, now = Date.now()) {
  pruneExpiredReceiptStatusAttempts(now);
  const prior = receiptStatusAttempts.get(receiptHash);
  if (prior && prior.expiresAt <= now) removeReceiptStatusAttempt(receiptHash, prior);
  const current = receiptStatusAttempts.get(receiptHash);
  if (!current) {
    if (receiptStatusAttempts.size >= receiptStatusMaxEntries) {
      // Reject new receipts while saturated rather than evicting an existing
      // entry and allowing an attacker-controlled stream to reach Prisma.
      throw new AccountDeletionError("ACCOUNT_DELETION_STATUS_LIMITED");
    }
    appendReceiptStatusAttempt(receiptHash, { count: 1, expiresAt: now + receiptStatusWindowMs, previous: null, next: null });
    return;
  }
  if (current.count >= receiptStatusMaxRequests) throw new AccountDeletionError("ACCOUNT_DELETION_STATUS_LIMITED");
  current.count += 1;
}

function appendReceiptStatusAttempt(receiptHash: string, entry: ReceiptStatusAttempt) {
  entry.previous = receiptStatusExpiryTail;
  if (receiptStatusExpiryTail) receiptStatusAttempts.get(receiptStatusExpiryTail)!.next = receiptHash;
  else receiptStatusExpiryHead = receiptHash;
  receiptStatusExpiryTail = receiptHash;
  receiptStatusAttempts.set(receiptHash, entry);
}

function removeReceiptStatusAttempt(receiptHash: string, entry: ReceiptStatusAttempt) {
  if (entry.previous) receiptStatusAttempts.get(entry.previous)!.next = entry.next;
  else receiptStatusExpiryHead = entry.next;
  if (entry.next) receiptStatusAttempts.get(entry.next)!.previous = entry.previous;
  else receiptStatusExpiryTail = entry.previous;
  receiptStatusAttempts.delete(receiptHash);
}

function pruneExpiredReceiptStatusAttempts(now: number) {
  let work = 0;
  // Bound public-request cleanup independently of map cardinality.
  while (receiptStatusExpiryHead && work < 16) {
    const receiptHash = receiptStatusExpiryHead;
    const entry = receiptStatusAttempts.get(receiptHash);
    if (!entry || entry.expiresAt > now) break;
    removeReceiptStatusAttempt(receiptHash, entry);
    work += 1;
  }
  receiptStatusLastCleanupWork = work;
}

export function accountDeletionRateLimitEntryCountForTests() {
  return receiptStatusAttempts.size;
}

export function resetAccountDeletionRateLimitForTests() {
  receiptStatusAttempts.clear();
  receiptStatusExpiryHead = null;
  receiptStatusExpiryTail = null;
  receiptStatusLastCleanupWork = 0;
}

export function accountDeletionRateLimitStatsForTests() {
  return { entryCount: receiptStatusAttempts.size, lastCleanupWork: receiptStatusLastCleanupWork };
}

export function recordAccountDeletionRateLimitForTests(receipt: string, now: number) {
  limitReceiptStatusLookup(accountDeletionHash(receipt), now);
}

export async function runAccountDeletionWorker(input: AccountDeletionWorkerOptions = {}) {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 20);
  const clock = input.clock ?? (() => new Date());
  let processed = 0;
  for (let index = 0; index < limit; index += 1) {
    const claimed = await claimNextDeletionOperation(clock);
    if (!claimed) break;
    processed += 1;
    await processClaimedDeletionOperation(claimed.request, claimed.lease, clock, input.hooks).catch(() => undefined);
  }
  await deliverCompletionEmailOutbox({ limit }, clock, input.hooks);
  await purgeFinishedDeletionReceipts(clock);
  return { processed };
}

async function claimNextDeletionOperation(clock: DeletionClock) {
  const now = clock();
  const candidate = await prisma.accountDeletionRequest.findFirst({
    where: {
      legalHold: false,
      stage: { in: ["VERIFIED", "STORAGE_PENDING", "DATABASE_PENDING", "AUTH_PENDING", "AUTH_DELETE_RETRY", "FAILED_RETRYABLE"] },
      OR: [
        { scheduledDeletionAt: null },
        { scheduledDeletionAt: { lte: now } },
      ],
      AND: [{ OR: [
        { nextAttemptAt: null },
        { nextAttemptAt: { lte: now } },
      ] }, { OR: [{ executionLeaseExpiresAt: null }, { executionLeaseExpiresAt: { lte: now } }] }],
    },
    orderBy: { updatedAt: "asc" },
  });
  if (!candidate) return null;

  const leaseId = randomUUID();
  const claimed = await prisma.accountDeletionRequest.updateMany({
    where: {
      id: candidate.id,
      stage: candidate.stage,
      operationVersion: candidate.operationVersion,
      legalHold: false,
      AND: [
        { OR: [{ scheduledDeletionAt: null }, { scheduledDeletionAt: { lte: now } }] },
        { OR: [{ executionLeaseExpiresAt: null }, { executionLeaseExpiresAt: { lte: now } }] },
      ],
    },
    data: {
      executionLeaseId: leaseId,
      executionLeaseExpiresAt: new Date(now.getTime() + leaseLifetimeMs),
      operationVersion: { increment: 1 },
    },
  });
  if (!claimed.count) return null;
  const request = await prisma.accountDeletionRequest.findUnique({ where: { id: candidate.id } });
  if (!request || request.executionLeaseId !== leaseId) return null;
  return { request, lease: { id: leaseId, operationVersion: request.operationVersion } };
}

/** Used by the disposable PostgreSQL harness to exercise the production CAS. */
export async function claimAccountDeletionOperationForTests(clock: DeletionClock = () => new Date()) {
  return claimNextDeletionOperation(clock);
}

/** Used by the disposable PostgreSQL harness to exercise a pre-existing lease. */
export async function processAccountDeletionClaimForTests(input: {
  requestId: string;
  leaseId: string;
  operationVersion: number;
  clock: DeletionClock;
  hooks?: AccountDeletionWorkerHooks;
}) {
  const request = await prisma.accountDeletionRequest.findUnique({ where: { id: input.requestId } });
  if (!request) return;
  await processClaimedDeletionOperation(
    request,
    { id: input.leaseId, operationVersion: input.operationVersion },
    input.clock,
    input.hooks,
  );
}

async function processClaimedDeletionOperation(
  request: WorkerRequest,
  lease: WorkerLease,
  clock: DeletionClock,
  hooks?: AccountDeletionWorkerHooks,
) {
  if (!request?.executionLeaseId || request.stage === "COMPLETED" || request.stage === "FAILED_FINAL") return;
  const authUserId = request.encryptedAuthUserId ? decryptAccountDeletionValue(request.encryptedAuthUserId) : null;
  if (!authUserId) return markDeletionFinal(request.id, lease, "AUTH_REFERENCE_UNAVAILABLE", clock);

  if (!request.storageCompletedAt) {
    if (!(await runStoragePhase(request.id, lease, authUserId, clock, hooks))) return;
  }
  const afterStorage = await findActiveDeletionOperation(
    request.id,
    lease,
    ["DATABASE_PENDING", "AUTH_PENDING", "AUTH_DELETE_RETRY", "FAILED_RETRYABLE"],
    clock(),
  );
  if (!afterStorage) return;

  let afterDatabase = afterStorage;
  if (!afterStorage.databaseCompletedAt) {
    if (!(await runDatabasePhase(afterStorage.id, lease, authUserId, afterStorage.authUserIdHash, clock, hooks))) return;
    const completedDatabase = await findActiveDeletionOperation(
      request.id,
      lease,
      ["AUTH_PENDING", "AUTH_DELETE_RETRY", "FAILED_RETRYABLE"],
      clock(),
    );
    if (!completedDatabase) return;
    afterDatabase = completedDatabase;
  }

  await runAuthPhase(afterDatabase.id, lease, authUserId, afterDatabase.encryptedEmail, afterDatabase.authProviderIdentity, clock, hooks);
}

async function runStoragePhase(requestId: string, lease: WorkerLease, authUserId: string, clock: DeletionClock, hooks?: AccountDeletionWorkerHooks) {
  const begun = await transition(requestId, lease, ["VERIFIED", "STORAGE_PENDING", "FAILED_RETRYABLE"], {
    stage: "STORAGE_PENDING", safeErrorCode: null,
  }, clock());
  if (!begun) return false;
  await hooks?.beforeStorage?.();
  if (!(await renewDeletionLease(requestId, lease, ["STORAGE_PENDING"], clock()))) return false;
  let reservation: RequestSideEffectReservation | null = null;
  try {
    const vehicles = await prisma.vehicle.findMany({ where: { userId: authUserId }, select: { imagePath: true } });
    const imagePaths = vehicles.flatMap((vehicle) => vehicle.imagePath ? [vehicle.imagePath] : []);
    if (imagePaths.some((path) => !path.startsWith(`${authUserId}/`))) {
      await markDeletionFinal(requestId, lease, "STORAGE_PATH_INVALID", clock);
      return false;
    }
    if (!imagePaths.length) {
      const now = clock();
      return transition(requestId, lease, ["STORAGE_PENDING"], {
        storageCompletedAt: now, stage: "DATABASE_PENDING", safeErrorCode: null, nextAttemptAt: now,
      }, now);
    }
    reservation = await reserveRequestSideEffect(requestId, lease, ["STORAGE_PENDING"], "storage", clock(), { storageTargets: imagePaths });
    if (!reservation) return false;
    // This hook is intentionally after the durable reservation and immediately
    // before invocation entry; the PostgreSQL harness uses it to prove fencing.
    await hooks?.afterStorageReservationBeforeAdapter?.();
    if (!(await beginRequestSideEffectInvocation(requestId, lease, ["STORAGE_PENDING"], "storage", reservation.id, clock()))) return false;
    await hooks?.afterStorageInvocationBeforeAdapter?.();
    await deleteVehicleImages(reservation.storageTargets);
    const now = clock();
    return completeRequestSideEffect(requestId, lease, ["STORAGE_PENDING"], "storage", reservation.id, {
      storageCompletedAt: now, stage: "DATABASE_PENDING", safeErrorCode: null, nextAttemptAt: now,
    }, now);
  } catch {
    await releaseRequestSideEffect(requestId, lease, "storage", reservation?.id ?? null, "STORAGE_DELETE_FAILED", "FAILED_RETRYABLE", clock);
    return false;
  }
}

class LeaseLostError extends Error {}

async function runDatabasePhase(
  requestId: string,
  lease: WorkerLease,
  authUserId: string,
  authUserIdHash: string,
  clock: DeletionClock,
  hooks?: AccountDeletionWorkerHooks,
) {
  const begun = await transition(requestId, lease, ["DATABASE_PENDING", "FAILED_RETRYABLE"], {
    stage: "DATABASE_PENDING", safeErrorCode: null,
  }, clock());
  if (!begun) return false;
  await hooks?.beforeDatabase?.();
  try {
    const transactionNow = clock();
    const transactionVersion = lease.operationVersion;
    await prisma.$transaction(async (tx) => {
      const reserved = await tx.accountDeletionRequest.updateMany({
        where: activeDeletionWhere(requestId, { ...lease, operationVersion: transactionVersion }, ["DATABASE_PENDING"], transactionNow),
        data: {
          executionLeaseExpiresAt: new Date(transactionNow.getTime() + leaseLifetimeMs),
          operationVersion: { increment: 1 },
        },
      });
      if (!reserved.count) throw new LeaseLostError();
      const registrations = await tx.registration.findMany({ where: { userId: authUserId }, select: { id: true } });
      const registrationIds = registrations.map((registration) => registration.id);
      const vehicles = await tx.vehicle.findMany({ where: { userId: authUserId }, select: { id: true } });
      const vehicleIds = vehicles.map((vehicle) => vehicle.id);
      if (registrationIds.length) {
        await tx.payment.deleteMany({ where: { registrationId: { in: registrationIds } } });
        await tx.emailLog.updateMany({ where: { registrationId: { in: registrationIds } }, data: { providerMessageId: null } });
        await tx.adminNote.updateMany({ where: { registrationId: { in: registrationIds } }, data: { authorLabel: "Anonim", body: "[Hesap silme kapsamında anonimleştirildi]" } });
        await tx.auditLog.updateMany({ where: { registrationId: { in: registrationIds } }, data: { before: Prisma.JsonNull, after: Prisma.JsonNull, reason: null, ipAddress: null } });
        await tx.registration.updateMany({ where: { id: { in: registrationIds } }, data: {
          userId: null, vehicleId: null, participantCode: null, qrTokenHash: null, qrIssuedAt: null,
          fullName: "Anonim katılımcı", phone: "", email: "", carBrandModel: "", plateNumber: "",
          emergencyContactName: "", emergencyContactPhone: "", consentIpAddress: null, adminNotes: null,
        } });
      }
      await tx.vehicleCatalogMatchRequest.deleteMany({ where: { userId: authUserId } });
      await tx.vehicleModification.deleteMany({ where: { vehicleId: { in: vehicleIds } } });
      await tx.vehicle.deleteMany({ where: { id: { in: vehicleIds } } });
      await tx.memberProfile.deleteMany({ where: { userId: authUserId } });
      await tx.user.update({ where: { id: authUserId }, data: {
        status: "DELETION_PENDING", email: `deleted-${authUserIdHash.slice(0, 32)}@invalid.local`,
        memberKvkkAcceptedAt: null, memberTermsAcceptedAt: null, memberMarketingConsentAt: null,
        memberMarketingConsentRevokedAt: null, memberConsentIpAddress: null, deletedAt: transactionNow,
      } });
      const completedAt = clock();
      const transitioned = await tx.accountDeletionRequest.updateMany({
        where: activeDeletionWhere(requestId, { ...lease, operationVersion: transactionVersion + 1 }, ["DATABASE_PENDING"], completedAt),
        data: {
          databaseCompletedAt: completedAt,
          stage: "AUTH_PENDING",
          safeErrorCode: null,
          nextAttemptAt: completedAt,
          operationVersion: { increment: 1 },
        },
      });
      if (!transitioned.count) throw new LeaseLostError();
      // The request-row lock remains held until this transaction commits. A
      // legal-hold setter that starts here waits, then observes the durable
      // databaseCompletedAt marker after commit.
      await hooks?.afterDatabaseCommitMarkerBeforePurge?.();
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    lease.operationVersion = transactionVersion + 2;
    return true;
  } catch (error) {
    if (error instanceof LeaseLostError) return false;
    await markDeletionRetryable(requestId, lease, "DATABASE_DELETE_FAILED", "FAILED_RETRYABLE", clock);
    return false;
  }
}

async function runAuthPhase(
  requestId: string,
  lease: WorkerLease,
  authUserId: string,
  encryptedEmail: string | null,
  authProviderIdentity: string | null,
  clock: DeletionClock,
  hooks?: AccountDeletionWorkerHooks,
) {
  const begun = await transition(requestId, lease, ["AUTH_PENDING", "AUTH_DELETE_RETRY", "FAILED_RETRYABLE"], {
    stage: "AUTH_PENDING", safeErrorCode: null,
  }, clock());
  if (!begun) return;
  await hooks?.beforeAuth?.();
  if (!(await renewDeletionLease(requestId, lease, ["AUTH_PENDING"], clock()))) return;

  const currentProviderIdentity = getSupabaseAdminProviderIdentity();
  if (!authProviderIdentity || !currentProviderIdentity || authProviderIdentity !== currentProviderIdentity) {
    return markDeletionFinal(requestId, lease, "AUTH_PROVIDER_IDENTITY_MISMATCH", clock);
  }
  const admin = createSupabaseAdminClient();
  if (!admin) return markDeletionRetryable(requestId, lease, "AUTH_CONFIGURATION", "AUTH_DELETE_RETRY", clock);
  await hooks?.beforeCompletion?.();
  const reservation = await reserveRequestSideEffect(requestId, lease, ["AUTH_PENDING"], "auth", clock());
  if (!reservation) return;
  await hooks?.afterAuthReservationBeforeAdapter?.();
  if (!(await beginRequestSideEffectInvocation(requestId, lease, ["AUTH_PENDING"], "auth", reservation.id, clock()))) return;
  await hooks?.afterAuthInvocationBeforeAdapter?.();
  const { error } = await admin.auth.admin.deleteUser(authUserId);
  // A missing Auth user safely reconciles the response-loss boundary only after
  // this operation has completed its own database tombstone phase.
  if (error && !isExactAuthUserNotFound(error)) {
    return releaseRequestSideEffect(requestId, lease, "auth", reservation.id, "AUTH_DELETE_FAILED", "AUTH_DELETE_RETRY", clock);
  }

  const now = clock();
  await prisma.$transaction(async (tx) => {
    await lockDeletionRequest(tx, requestId);
    const completed = await tx.accountDeletionRequest.updateMany({
      where: {
        ...activeRequestSideEffectWhere(requestId, lease, ["AUTH_PENDING"], "auth", reservation.id),
      },
      data: {
        stage: "COMPLETED", authCompletedAt: now, completedAt: now, purgeAfter: new Date(now.getTime() + receiptRetentionMs),
        safeErrorCode: null, verificationHash: null, verificationExpiresAt: null, encryptedAuthUserId: null,
        executionLeaseId: null, executionLeaseExpiresAt: null, nextAttemptAt: null,
        authReservationId: null, authReservationExpiresAt: null,
        authInvocationState: AccountDeletionSideEffectInvocationState.SUCCEEDED,
        operationVersion: { increment: 1 },
      },
    });
    if (!completed.count) return;
    await tx.user.deleteMany({ where: { id: authUserId, status: "DELETION_PENDING" } });
    if (encryptedEmail) {
      await tx.accountDeletionEmailOutbox.upsert({
        where: { accountDeletionRequestId: requestId },
        update: {},
        create: { accountDeletionRequestId: requestId, recipientCiphertext: encryptedEmail },
      });
    }
  });
  // A zero-row completion CAS means the lease was lost or a legal hold was
  // applied. In either case the durable request remains retryable in AUTH_PENDING.
}

function activeDeletionWhere(requestId: string, lease: WorkerLease, stages: AccountDeletionStage[], now: Date): Prisma.AccountDeletionRequestWhereInput {
  return {
    id: requestId,
    executionLeaseId: lease.id,
    operationVersion: lease.operationVersion,
    executionLeaseExpiresAt: { gt: now },
    legalHold: false,
    stage: { in: stages },
  };
}

type RequestSideEffect = "storage" | "auth";

const requestSideEffectFields = {
  storage: {
    id: "storageReservationId",
    expiresAt: "storageReservationExpiresAt",
    key: "storageInvocationKey",
    state: "storageInvocationState",
    startedAt: "storageInvocationStartedAt",
  },
  auth: {
    id: "authReservationId",
    expiresAt: "authReservationExpiresAt",
    key: "authInvocationKey",
    state: "authInvocationState",
    startedAt: "authInvocationStartedAt",
  },
} as const;

type RequestSideEffectReservation = {
  id: string;
  idempotencyKey: string;
  storageTargets: string[];
};

async function lockDeletionRequest(tx: Prisma.TransactionClient, requestId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "AccountDeletionRequest" WHERE "id" = ${requestId} FOR UPDATE`);
}

/**
 * A reservation is the durable, database-serialized commit point for a single
 * external side effect. No transaction stays open while the adapter runs.
 */
async function reserveRequestSideEffect(
  requestId: string,
  lease: WorkerLease,
  stages: AccountDeletionStage[],
  sideEffect: RequestSideEffect,
  now: Date,
  input: { storageTargets?: string[] } = {},
) {
  const fields = requestSideEffectFields[sideEffect];
  const reservationId = randomUUID();
  const reservation = await prisma.$transaction(async (tx) => {
    await lockDeletionRequest(tx, requestId);
    const request = await tx.accountDeletionRequest.findUnique({ where: { id: requestId } });
    if (!request) return null;
    const previousState = request[fields.state];
    const idempotencyKey = request[fields.key] ?? `account-deletion/${requestId}/${sideEffect}`;
    const storageTargets = sideEffect === "storage"
      ? readStorageInvocationTargets(request.storageInvocationTarget, input.storageTargets ?? [])
      : [];
    const updated = await tx.accountDeletionRequest.updateMany({
      where: {
        ...activeDeletionWhere(requestId, lease, stages, now),
        OR: [{ [fields.id]: null }, { [fields.expiresAt]: { lte: now } }],
      },
      data: {
        [fields.id]: reservationId,
        [fields.expiresAt]: new Date(now.getTime() + leaseLifetimeMs),
        [fields.key]: idempotencyKey,
        [fields.state]: previousState === AccountDeletionSideEffectInvocationState.INVOKING
          ? AccountDeletionSideEffectInvocationState.RECONCILING
          : AccountDeletionSideEffectInvocationState.RESERVED,
        [fields.startedAt]: null,
        ...(sideEffect === "storage" ? { storageInvocationTarget: storageTargets } : {}),
        executionLeaseExpiresAt: new Date(now.getTime() + leaseLifetimeMs),
        operationVersion: { increment: 1 },
      },
    });
    return updated.count === 1 ? { id: reservationId, idempotencyKey, storageTargets } : null;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (reservation) lease.operationVersion += 1;
  return reservation;
}

function readStorageInvocationTargets(value: Prisma.JsonValue | null, fallback: string[]) {
  if (!Array.isArray(value) || !value.every((path) => typeof path === "string")) return Array.from(new Set(fallback));
  return Array.from(new Set(value));
}

function activeRequestSideEffectWhere(
  requestId: string,
  lease: WorkerLease,
  stages: AccountDeletionStage[],
  sideEffect: RequestSideEffect,
  reservationId: string,
): Prisma.AccountDeletionRequestWhereInput {
  const fields = requestSideEffectFields[sideEffect];
  return {
    id: requestId,
    executionLeaseId: lease.id,
    operationVersion: lease.operationVersion,
    stage: { in: stages },
    [fields.id]: reservationId,
  };
}

async function beginRequestSideEffectInvocation(
  requestId: string,
  lease: WorkerLease,
  stages: AccountDeletionStage[],
  sideEffect: RequestSideEffect,
  reservationId: string,
  now: Date,
) {
  const fields = requestSideEffectFields[sideEffect];
  const begun = await prisma.$transaction(async (tx) => {
    await lockDeletionRequest(tx, requestId);
    return tx.accountDeletionRequest.updateMany({
      where: {
        ...activeRequestSideEffectWhere(requestId, lease, stages, sideEffect, reservationId),
        [fields.expiresAt]: { gt: now },
        [fields.state]: { in: [AccountDeletionSideEffectInvocationState.RESERVED, AccountDeletionSideEffectInvocationState.RECONCILING] },
      },
      data: { [fields.state]: AccountDeletionSideEffectInvocationState.INVOKING, [fields.startedAt]: now },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return begun.count === 1;
}

async function completeRequestSideEffect(
  requestId: string,
  lease: WorkerLease,
  stages: AccountDeletionStage[],
  sideEffect: RequestSideEffect,
  reservationId: string,
  data: Prisma.AccountDeletionRequestUpdateManyMutationInput,
  now: Date,
) {
  const fields = requestSideEffectFields[sideEffect];
  let completed = false;
  await prisma.$transaction(async (tx) => {
    await lockDeletionRequest(tx, requestId);
    const request = await tx.accountDeletionRequest.findUnique({ where: { id: requestId }, select: { legalHold: true } });
    const updated = await tx.accountDeletionRequest.updateMany({
      where: {
        ...activeRequestSideEffectWhere(requestId, lease, stages, sideEffect, reservationId),
      },
      data: {
        ...data,
        [fields.id]: null,
        [fields.expiresAt]: null,
        [fields.state]: AccountDeletionSideEffectInvocationState.SUCCEEDED,
        ...(request?.legalHold ? { executionLeaseId: null, executionLeaseExpiresAt: null } : {}),
        operationVersion: { increment: 1 },
      },
    });
    completed = updated.count === 1;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (completed) lease.operationVersion += 1;
  return completed;
}

async function releaseRequestSideEffect(
  requestId: string,
  lease: WorkerLease,
  sideEffect: RequestSideEffect,
  reservationId: string | null,
  safeErrorCode: string,
  stage: AccountDeletionStage,
  clock: DeletionClock,
) {
  const fields = requestSideEffectFields[sideEffect];
  const at = clock();
  const released = await prisma.accountDeletionRequest.updateMany({
    where: reservationId
      ? activeRequestSideEffectWhere(requestId, lease, ["STORAGE_PENDING", "AUTH_PENDING", "AUTH_DELETE_RETRY", "FAILED_RETRYABLE"], sideEffect, reservationId)
      : activeDeletionWhere(requestId, lease, ["STORAGE_PENDING", "AUTH_PENDING", "AUTH_DELETE_RETRY", "FAILED_RETRYABLE"], at),
    data: {
      stage,
      safeErrorCode,
      nextAttemptAt: new Date(at.getTime() + leaseLifetimeMs),
      executionLeaseId: null,
      executionLeaseExpiresAt: null,
      [fields.id]: null,
      [fields.expiresAt]: null,
      [fields.state]: AccountDeletionSideEffectInvocationState.RETRYABLE,
      operationVersion: { increment: 1 },
    },
  });
  if (released.count) lease.operationVersion += 1;
}

export type AccountDeletionLegalHoldResult =
  | { status: "APPLIED" | "CLEARED" | "ALREADY_APPLIED" }
  | { status: "COMMIT_POINT_PASSED"; sideEffects: Array<"database" | "storage" | "auth" | "completion_email"> }
  | { status: "NOT_FOUND" };

/**
 * The legal-hold setter and reservations lock the same request row. A hold
 * therefore either wins before any adapter reservation, or truthfully reports
 * that it can no longer stop the already-reserved side effect.
 */
export async function setAccountDeletionLegalHold(input: {
  requestId: string;
  active: boolean;
  reason?: string | null;
  until?: Date | null;
  now?: Date;
}, database: Pick<typeof prisma, "$transaction"> = prisma): Promise<AccountDeletionLegalHoldResult> {
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    await lockDeletionRequest(tx, input.requestId);
    const request = await tx.accountDeletionRequest.findUnique({
      where: { id: input.requestId },
      include: { emailOutbox: { select: { deliveryReservationId: true, deliveryReservationExpiresAt: true } } },
    });
    if (!request) return { status: "NOT_FOUND" };
    if (!input.active) {
      if (!request.legalHold) return { status: "CLEARED" };
      await tx.accountDeletionRequest.update({ where: { id: request.id }, data: { legalHold: false, legalHoldReason: null, legalHoldUntil: null } });
      return { status: "CLEARED" };
    }
    if (request.legalHold) return { status: "ALREADY_APPLIED" };
    const sideEffects: Array<"database" | "storage" | "auth" | "completion_email"> = [];
    // databaseCompletedAt is committed atomically with the database purge.
    // A transaction rollback removes it, so this is a truthful commit marker.
    if (request.databaseCompletedAt) sideEffects.push("database");
    if (request.storageReservationId && request.storageReservationExpiresAt && request.storageReservationExpiresAt > now) sideEffects.push("storage");
    if (request.authReservationId && request.authReservationExpiresAt && request.authReservationExpiresAt > now) sideEffects.push("auth");
    if (request.emailOutbox.some((outbox) => outbox.deliveryReservationId && outbox.deliveryReservationExpiresAt && outbox.deliveryReservationExpiresAt > now)) sideEffects.push("completion_email");
    await tx.accountDeletionRequest.update({
      where: { id: request.id, legalHold: false },
      data: { legalHold: true, legalHoldReason: input.reason ?? null, legalHoldUntil: input.until ?? null },
    });
    if (sideEffects.length) return { status: "COMMIT_POINT_PASSED", sideEffects };
    return { status: "APPLIED" };
  });
}

async function findActiveDeletionOperation(requestId: string, lease: WorkerLease, stages: AccountDeletionStage[], now: Date) {
  return prisma.accountDeletionRequest.findFirst({ where: activeDeletionWhere(requestId, lease, stages, now) });
}

async function renewDeletionLease(requestId: string, lease: WorkerLease, stages: AccountDeletionStage[], now: Date) {
  const renewed = await prisma.accountDeletionRequest.updateMany({
    where: activeDeletionWhere(requestId, lease, stages, now),
    data: {
      executionLeaseExpiresAt: new Date(now.getTime() + leaseLifetimeMs),
      operationVersion: { increment: 1 },
    },
  });
  if (!renewed.count) return false;
  lease.operationVersion += 1;
  return true;
}

async function transition(requestId: string, lease: WorkerLease, from: AccountDeletionStage[], data: Prisma.AccountDeletionRequestUpdateManyMutationInput, now: Date) {
  const updated = await prisma.accountDeletionRequest.updateMany({
    where: activeDeletionWhere(requestId, lease, from, now),
    data: { ...data, operationVersion: { increment: 1 } },
  });
  if (!updated.count) return false;
  lease.operationVersion += 1;
  return true;
}

async function markDeletionRetryable(requestId: string, lease: WorkerLease, safeErrorCode: string, stage: AccountDeletionStage = "FAILED_RETRYABLE", now: DeletionClock = () => new Date()) {
  const at = now();
  await prisma.accountDeletionRequest.updateMany({
    where: activeDeletionWhere(requestId, lease, ["VERIFIED", "STORAGE_PENDING", "DATABASE_PENDING", "AUTH_PENDING", "AUTH_DELETE_RETRY", "FAILED_RETRYABLE"], at),
    data: { stage, safeErrorCode, nextAttemptAt: new Date(at.getTime() + leaseLifetimeMs), executionLeaseId: null, executionLeaseExpiresAt: null, operationVersion: { increment: 1 } },
  });
}

async function markDeletionFinal(requestId: string, lease: WorkerLease, safeErrorCode: string, clock: DeletionClock) {
  await prisma.accountDeletionRequest.updateMany({
    where: activeDeletionWhere(requestId, lease, ["VERIFIED", "STORAGE_PENDING", "DATABASE_PENDING", "AUTH_PENDING", "AUTH_DELETE_RETRY", "FAILED_RETRYABLE"], clock()),
    data: { stage: "FAILED_FINAL", safeErrorCode, executionLeaseId: null, executionLeaseExpiresAt: null, nextAttemptAt: null, operationVersion: { increment: 1 } },
  });
}

async function deliverCompletionEmailOutbox(
  input: { limit: number },
  clock: DeletionClock,
  hooks?: AccountDeletionWorkerHooks,
) {
  for (let index = 0; index < input.limit; index += 1) {
    const now = clock();
    const outbox = await prisma.accountDeletionEmailOutbox.findFirst({
      where: {
        request: { legalHold: false },
        status: { in: ["PENDING", "RETRYABLE"] },
        OR: [{ executionLeaseExpiresAt: null }, { executionLeaseExpiresAt: { lte: now } }],
      },
      orderBy: { createdAt: "asc" },
    });
    if (!outbox) return;
    const leaseId = randomUUID();
    const claimed = await prisma.accountDeletionEmailOutbox.updateMany({
      where: {
        id: outbox.id,
        request: { legalHold: false },
        status: { in: ["PENDING", "RETRYABLE"] },
        OR: [{ executionLeaseExpiresAt: null }, { executionLeaseExpiresAt: { lte: now } }],
      },
      data: { executionLeaseId: leaseId, executionLeaseExpiresAt: new Date(now.getTime() + leaseLifetimeMs), attemptCount: { increment: 1 }, lastAttemptAt: now },
    });
    if (!claimed.count || (!outbox.recipientCiphertext && !outbox.deliveryPayloadCiphertext)) continue;
    try {
      await hooks?.beforeCompletionEmail?.();
      const payload = readCompletionEmailPayload(outbox);
      const reservation = await reserveCompletionEmailSideEffect(outbox.id, outbox.accountDeletionRequestId, leaseId, clock(), payload);
      if (!reservation) {
        await prisma.accountDeletionEmailOutbox.updateMany({ where: { id: outbox.id, executionLeaseId: leaseId }, data: { executionLeaseId: null, executionLeaseExpiresAt: null } });
        continue;
      }
      await hooks?.afterCompletionEmailReservationBeforeAdapter?.();
      if (!(await beginCompletionEmailInvocation(outbox.id, outbox.accountDeletionRequestId, leaseId, reservation.id, clock()))) continue;
      await hooks?.afterCompletionEmailInvocationBeforeAdapter?.();
      const delivery = await sendAccountDeletionCompletedEmail({ payload: reservation.payload, idempotencyKey: reservation.idempotencyKey });
      await hooks?.afterCompletionEmailAdapterBeforeSuccessCommit?.();
      await prisma.$transaction(async (tx) => {
        await lockDeletionRequest(tx, outbox.accountDeletionRequestId);
        const completed = await tx.accountDeletionEmailOutbox.updateMany({
          where: {
            id: outbox.id,
            executionLeaseId: leaseId,
            deliveryReservationId: reservation.id,
            deliveryInvocationState: { in: [AccountDeletionSideEffectInvocationState.INVOKING, AccountDeletionSideEffectInvocationState.RECONCILING] },
          },
          data: {
            status: "SENT", sentAt: clock(), recipientCiphertext: null,
            executionLeaseId: null, executionLeaseExpiresAt: null,
            deliveryReservationId: null, deliveryReservationExpiresAt: null,
            deliveryInvocationState: AccountDeletionSideEffectInvocationState.SUCCEEDED,
            providerMessageId: delivery.providerMessageId,
            safeErrorCode: null,
          },
        });
        if (completed.count) {
          await tx.accountDeletionRequest.updateMany({
            where: { id: outbox.accountDeletionRequestId },
            data: { encryptedEmail: null },
          });
        }
      });
    } catch (error) {
      const safeErrorCode = error instanceof AccountDeletionCompletedEmailError
        ? error.safeCode
        : "COMPLETION_EMAIL_FAILED";
      const reconciliationRequired = error instanceof AccountDeletionCompletedEmailError
        && error.disposition === "RECONCILIATION_REQUIRED";
      await releaseCompletionEmailSideEffect(outbox.id, outbox.accountDeletionRequestId, leaseId, safeErrorCode, reconciliationRequired, clock);
    }
  }
}

type CompletionEmailReservation = {
  id: string;
  idempotencyKey: string;
  payload: AccountDeletionCompletedEmailPayload;
};

async function reserveCompletionEmailSideEffect(
  outboxId: string,
  requestId: string,
  leaseId: string,
  now: Date,
  payload: AccountDeletionCompletedEmailPayload,
) {
  const reservationId = randomUUID();
  return prisma.$transaction(async (tx) => {
    await lockDeletionRequest(tx, requestId);
    const outbox = await tx.accountDeletionEmailOutbox.findUnique({ where: { id: outboxId } });
    if (!outbox) return null;
    if (outbox.deliveryRetryDeadlineAt && outbox.deliveryRetryDeadlineAt <= now) {
      await tx.accountDeletionEmailOutbox.updateMany({
        where: { id: outboxId, executionLeaseId: leaseId },
        data: {
          status: "RECONCILIATION_REQUIRED",
          safeErrorCode: "COMPLETION_EMAIL_RECONCILIATION_REQUIRED",
          reconciliationRequiredAt: now,
          executionLeaseId: null,
          executionLeaseExpiresAt: null,
          deliveryReservationId: null,
          deliveryReservationExpiresAt: null,
          deliveryInvocationState: AccountDeletionSideEffectInvocationState.RECONCILING,
        },
      });
      return null;
    }
    const idempotencyKey = outbox.deliveryInvocationKey ?? `account-deletion/${requestId}/completion-email`;
    const payloadCiphertext = outbox.deliveryPayloadCiphertext ?? encryptAccountDeletionValue(JSON.stringify(payload));
    const payloadFingerprint = outbox.deliveryPayloadFingerprint ?? accountDeletionHash(JSON.stringify(payload));
    const updated = await tx.accountDeletionEmailOutbox.updateMany({
      where: {
        id: outboxId,
        accountDeletionRequestId: requestId,
        executionLeaseId: leaseId,
        executionLeaseExpiresAt: { gt: now },
        status: { in: ["PENDING", "RETRYABLE"] },
        request: { legalHold: false },
        OR: [{ deliveryReservationId: null }, { deliveryReservationExpiresAt: { lte: now } }],
      },
      data: {
        deliveryReservationId: reservationId,
        deliveryReservationExpiresAt: new Date(now.getTime() + leaseLifetimeMs),
        deliveryInvocationKey: idempotencyKey,
        deliveryPayloadCiphertext: payloadCiphertext,
        deliveryPayloadFingerprint: payloadFingerprint,
        deliveryInvocationState: outbox.deliveryInvocationState === AccountDeletionSideEffectInvocationState.INVOKING
          ? AccountDeletionSideEffectInvocationState.RECONCILING
          : AccountDeletionSideEffectInvocationState.RESERVED,
        deliveryInvocationStartedAt: null,
        executionLeaseExpiresAt: new Date(now.getTime() + leaseLifetimeMs),
      },
    });
    return updated.count === 1 ? { id: reservationId, idempotencyKey, payload } : null;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function beginCompletionEmailInvocation(
  outboxId: string,
  requestId: string,
  leaseId: string,
  reservationId: string,
  now: Date,
) {
  const begun = await prisma.$transaction(async (tx) => {
    await lockDeletionRequest(tx, requestId);
    const outbox = await tx.accountDeletionEmailOutbox.findUnique({
      where: { id: outboxId },
      select: { deliveryFirstTransportAt: true, deliveryRetryDeadlineAt: true },
    });
    if (!outbox) return { count: 0 };
    return tx.accountDeletionEmailOutbox.updateMany({
      where: {
        id: outboxId,
        accountDeletionRequestId: requestId,
        executionLeaseId: leaseId,
        deliveryReservationId: reservationId,
        deliveryReservationExpiresAt: { gt: now },
        status: { in: ["PENDING", "RETRYABLE"] },
        deliveryInvocationState: { in: [AccountDeletionSideEffectInvocationState.RESERVED, AccountDeletionSideEffectInvocationState.RECONCILING] },
      },
      data: {
        deliveryInvocationState: AccountDeletionSideEffectInvocationState.INVOKING,
        deliveryInvocationStartedAt: now,
        deliveryFirstTransportAt: outbox.deliveryFirstTransportAt ?? now,
        deliveryRetryDeadlineAt: outbox.deliveryRetryDeadlineAt ?? new Date(now.getTime() + completionEmailRetryWindowMs),
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return begun.count === 1;
}

async function releaseCompletionEmailSideEffect(
  outboxId: string,
  requestId: string,
  leaseId: string,
  safeErrorCode: string,
  reconciliationRequired: boolean,
  clock: DeletionClock,
) {
  const now = clock();
  await prisma.$transaction(async (tx) => {
    await lockDeletionRequest(tx, requestId);
    const outbox = await tx.accountDeletionEmailOutbox.findUnique({
      where: { id: outboxId },
      select: { deliveryRetryDeadlineAt: true },
    });
    if (!outbox) return;
    const deadlinePassed = Boolean(outbox.deliveryRetryDeadlineAt && outbox.deliveryRetryDeadlineAt <= now);
    const requiresReconciliation = reconciliationRequired || deadlinePassed;
    await tx.accountDeletionEmailOutbox.updateMany({
      where: { id: outboxId, executionLeaseId: leaseId },
      data: {
        status: requiresReconciliation ? "RECONCILIATION_REQUIRED" : "RETRYABLE",
        safeErrorCode: requiresReconciliation ? "COMPLETION_EMAIL_RECONCILIATION_REQUIRED" : safeErrorCode,
        reconciliationRequiredAt: requiresReconciliation ? now : null,
        executionLeaseId: null,
        executionLeaseExpiresAt: null,
        deliveryReservationId: null,
        deliveryReservationExpiresAt: null,
        deliveryInvocationState: requiresReconciliation
          ? AccountDeletionSideEffectInvocationState.RECONCILING
          : AccountDeletionSideEffectInvocationState.RETRYABLE,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function readCompletionEmailPayload(outbox: {
  recipientCiphertext: string | null;
  deliveryPayloadCiphertext: string | null;
}): AccountDeletionCompletedEmailPayload {
  if (!outbox.deliveryPayloadCiphertext) {
    if (!outbox.recipientCiphertext) throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
    return createAccountDeletionCompletedEmailPayload(decryptAccountDeletionValue(outbox.recipientCiphertext));
  }

  const value: unknown = JSON.parse(decryptAccountDeletionValue(outbox.deliveryPayloadCiphertext));
  if (!value || typeof value !== "object") throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
  const record = value as Record<string, unknown>;
  if (![record.to, record.from, record.subject, record.text, record.html].every((entry) => typeof entry === "string" && entry.length > 0)) {
    throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
  }
  return {
    to: record.to as string,
    from: record.from as string,
    subject: record.subject as string,
    text: record.text as string,
    html: record.html as string,
  };
}

async function purgeFinishedDeletionReceipts(clock: DeletionClock) {
  await prisma.accountDeletionRequest.deleteMany({
    where: {
      legalHold: false,
      stage: { in: ["COMPLETED", "CANCELLED"] },
      purgeAfter: { lte: clock() },
      emailOutbox: { none: { status: { in: ["PENDING", "RETRYABLE", "RECONCILIATION_REQUIRED"] } } },
    },
  });
}

async function deleteVehicleImages(imagePaths: string[]) {
  if (!imagePaths.length) return;
  const admin = createSupabaseAdminClient();
  if (!admin) throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
  const { error } = await admin.storage.from(vehicleImagesBucket).remove(Array.from(new Set(imagePaths)));
  // Only Supabase Storage's exact missing-object code is idempotent. Other
  // 404s can mean a missing bucket, tenant, or unrecognized contract drift.
  if (error && storageErrorCode(error) !== "NoSuchKey") throw new AccountDeletionError("ACCOUNT_DELETION_STORAGE_FAILED");
}

function statusFromUnknown(error: unknown) {
  if (typeof error !== "object" || !error) return null;
  const candidate = error as { status?: unknown; statusCode?: unknown };
  const value = candidate.status ?? candidate.statusCode;
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d{3}$/.test(value)) return Number(value);
  return null;
}

function providerErrorCode(error: unknown) {
  if (typeof error !== "object" || !error) return null;
  const candidate = error as { code?: unknown; error?: unknown };
  const value = candidate.code ?? candidate.error;
  return typeof value === "string" ? value : null;
}

function storageErrorCode(error: unknown) {
  if (typeof error !== "object" || !error) return null;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  if (typeof statusCode === "string" && !/^\d{3}$/.test(statusCode)) return statusCode;
  return providerErrorCode(error);
}

function isExactAuthUserNotFound(error: unknown) {
  return statusFromUnknown(error) === 404 && providerErrorCode(error) === "user_not_found";
}
