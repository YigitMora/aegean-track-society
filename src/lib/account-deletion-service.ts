import { randomInt, randomUUID } from "node:crypto";

import { AccountDeletionStage, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { vehicleImagesBucket } from "@/lib/vehicle-images";
import {
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
const resendCooldownMs = 60 * 1000;
const maxResends = 3;
const maxVerificationAttempts = 5;
const leaseLifetimeMs = 60 * 1000;
const receiptRetentionMs = 7 * 24 * 60 * 60 * 1000;
const receiptStatusWindowMs = 60 * 1000;
const receiptStatusMaxRequests = 20;
const receiptStatusAttempts = new Map<string, { count: number; startedAt: number }>();

type WorkerRequest = Awaited<ReturnType<typeof prisma.accountDeletionRequest.findUnique>>;

export async function startAccountDeletionVerification(input: { authUserId: string; email: string }) {
  const authUserIdHash = accountDeletionHash(input.authUserId);
  const now = new Date();
  const existing = await prisma.accountDeletionRequest.findUnique({ where: { authUserIdHash } });

  if (existing && existing.stage !== "VERIFICATION_PENDING") {
    throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  }
  if (existing?.legalHold) throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  if (existing?.lastSentAt && now.getTime() - existing.lastSentAt.getTime() < resendCooldownMs) {
    throw new AccountDeletionError("ACCOUNT_DELETION_VERIFICATION_LIMITED");
  }
  if (existing && existing.resendCount >= maxResends) throw new AccountDeletionError("ACCOUNT_DELETION_VERIFICATION_LIMITED");

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
  };

  if (existing) {
    const updated = await prisma.accountDeletionRequest.updateMany({
      where: { id: existing.id, stage: "VERIFICATION_PENDING", resendCount: { lt: maxResends } },
      data: { ...common, resendCount: { increment: 1 }, operationVersion: { increment: 1 } },
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
}) {
  const authUserIdHash = accountDeletionHash(input.authUserId);
  const idempotencyKeyHash = accountDeletionHash(input.idempotencyKey);
  const now = new Date();
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
      where: { id: request.id, stage: "VERIFICATION_PENDING", verificationAttempts: { lt: maxVerificationAttempts } },
      data: { verificationAttempts: { increment: 1 } },
    });
    throw new AccountDeletionError("ACCOUNT_DELETION_VERIFICATION_INVALID");
  }

  // Compare-and-set means a second instance cannot overwrite this operation
  // with another idempotency key or execute the external deletion steps.
  const started = await prisma.accountDeletionRequest.updateMany({
    where: {
      id: request.id,
      stage: "VERIFICATION_PENDING",
      idempotencyKeyHash: null,
      verificationHash: request.verificationHash,
      verificationExpiresAt: { gt: now },
    },
    data: {
      stage: "VERIFIED",
      idempotencyKeyHash,
      verificationHash: null,
      verificationExpiresAt: null,
      safeErrorCode: null,
      nextAttemptAt: now,
      operationVersion: { increment: 1 },
    },
  });
  if (!started.count) {
    const current = await prisma.accountDeletionRequest.findUnique({ where: { id: request.id }, select: { idempotencyKeyHash: true } });
    if (current?.idempotencyKeyHash === idempotencyKeyHash) return { data: { status: "pending" as const } };
    throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  }

  void runAccountDeletionWorker({ limit: 1 }).catch(() => undefined);
  return { data: { status: "pending" as const } };
}

export async function getAccountDeletionStatusByReceipt(receipt: string) {
  const receiptHash = accountDeletionHash(receipt);
  limitReceiptStatusLookup(receiptHash);
  const request = await prisma.accountDeletionRequest.findUnique({
    where: { operationReceiptHash: receiptHash },
    select: { stage: true, legalHold: true, updatedAt: true },
  });
  if (!request) throw new AccountDeletionError("ACCOUNT_DELETION_STATUS_UNAVAILABLE");
  if (request.legalHold) return { data: { status: "blocked" as const } };
  if (request.stage === "COMPLETED") return { data: { status: "completed" as const } };
  if (request.stage === "FAILED_FINAL") return { data: { status: "failed_final" as const } };
  return { data: { status: "pending" as const } };
}

function limitReceiptStatusLookup(receiptHash: string) {
  const now = Date.now();
  const prior = receiptStatusAttempts.get(receiptHash);
  if (!prior || now - prior.startedAt > receiptStatusWindowMs) {
    receiptStatusAttempts.set(receiptHash, { count: 1, startedAt: now });
    return;
  }
  if (prior.count >= receiptStatusMaxRequests) throw new AccountDeletionError("ACCOUNT_DELETION_STATUS_LIMITED");
  prior.count += 1;
}

export async function runAccountDeletionWorker(input: { limit?: number } = {}) {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 20);
  let processed = 0;
  for (let index = 0; index < limit; index += 1) {
    const claimed = await claimNextDeletionOperation();
    if (!claimed) break;
    processed += 1;
    await processClaimedDeletionOperation(claimed).catch(() => undefined);
  }
  await deliverCompletionEmailOutbox({ limit });
  await purgeCompletedDeletionReceipts();
  return { processed };
}

async function claimNextDeletionOperation() {
  const now = new Date();
  const candidate = await prisma.accountDeletionRequest.findFirst({
    where: {
      legalHold: false,
      stage: { in: ["VERIFIED", "STORAGE_PENDING", "DATABASE_PENDING", "AUTH_PENDING", "AUTH_DELETE_RETRY", "FAILED_RETRYABLE"] },
      OR: [
        { nextAttemptAt: null },
        { nextAttemptAt: { lte: now } },
      ],
      AND: [{ OR: [{ executionLeaseExpiresAt: null }, { executionLeaseExpiresAt: { lte: now } }] }],
    },
    orderBy: { updatedAt: "asc" },
  });
  if (!candidate) return null;

  const leaseId = randomUUID();
  const claimed = await prisma.accountDeletionRequest.updateMany({
    where: {
      id: candidate.id,
      stage: candidate.stage,
      legalHold: false,
      OR: [{ executionLeaseExpiresAt: null }, { executionLeaseExpiresAt: { lte: now } }],
    },
    data: {
      executionLeaseId: leaseId,
      executionLeaseExpiresAt: new Date(now.getTime() + leaseLifetimeMs),
      operationVersion: { increment: 1 },
    },
  });
  if (!claimed.count) return null;
  return prisma.accountDeletionRequest.findUnique({ where: { id: candidate.id } });
}

async function processClaimedDeletionOperation(request: WorkerRequest) {
  if (!request?.executionLeaseId || request.stage === "COMPLETED" || request.stage === "FAILED_FINAL") return;
  const leaseId = request.executionLeaseId;
  const authUserId = request.encryptedAuthUserId ? decryptAccountDeletionValue(request.encryptedAuthUserId) : null;
  if (!authUserId) return markDeletionFinal(request.id, leaseId, "AUTH_REFERENCE_UNAVAILABLE");

  if (!request.storageCompletedAt) {
    if (!(await runStoragePhase(request.id, leaseId, authUserId))) return;
  }
  const afterStorage = await prisma.accountDeletionRequest.findUnique({ where: { id: request.id } });
  if (!afterStorage?.executionLeaseId || afterStorage.executionLeaseId !== leaseId) return;

  if (!afterStorage.databaseCompletedAt) {
    if (!(await runDatabasePhase(afterStorage.id, leaseId, authUserId, afterStorage.authUserIdHash))) return;
  }
  const afterDatabase = await prisma.accountDeletionRequest.findUnique({ where: { id: request.id } });
  if (!afterDatabase?.executionLeaseId || afterDatabase.executionLeaseId !== leaseId) return;

  await runAuthPhase(afterDatabase.id, leaseId, authUserId, afterDatabase.encryptedEmail);
}

async function runStoragePhase(requestId: string, leaseId: string, authUserId: string) {
  const begun = await transition(requestId, leaseId, ["VERIFIED", "FAILED_RETRYABLE"], {
    stage: "STORAGE_PENDING", safeErrorCode: null,
  });
  if (!begun) return false;
  try {
    const vehicles = await prisma.vehicle.findMany({ where: { userId: authUserId }, select: { imagePath: true } });
    const imagePaths = vehicles.flatMap((vehicle) => vehicle.imagePath ? [vehicle.imagePath] : []);
    if (imagePaths.some((path) => !path.startsWith(`${authUserId}/`))) {
      await markDeletionFinal(requestId, leaseId, "STORAGE_PATH_INVALID");
      return false;
    }
    await deleteVehicleImages(imagePaths);
    return transition(requestId, leaseId, ["STORAGE_PENDING"], {
      storageCompletedAt: new Date(), stage: "DATABASE_PENDING", safeErrorCode: null, nextAttemptAt: new Date(),
    });
  } catch {
    await markDeletionRetryable(requestId, leaseId, "STORAGE_DELETE_FAILED");
    return false;
  }
}

async function runDatabasePhase(requestId: string, leaseId: string, authUserId: string, authUserIdHash: string) {
  const begun = await transition(requestId, leaseId, ["DATABASE_PENDING", "FAILED_RETRYABLE"], {
    stage: "DATABASE_PENDING", safeErrorCode: null,
  });
  if (!begun) return false;
  try {
    await prisma.$transaction(async (tx) => {
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
        memberMarketingConsentRevokedAt: null, memberConsentIpAddress: null, deletedAt: new Date(),
      } });
      const transitioned = await tx.accountDeletionRequest.updateMany({
        where: { id: requestId, executionLeaseId: leaseId, stage: "DATABASE_PENDING" },
        data: { databaseCompletedAt: new Date(), stage: "AUTH_PENDING", safeErrorCode: null, nextAttemptAt: new Date() },
      });
      if (!transitioned.count) throw new Error("lease lost");
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return true;
  } catch {
    await markDeletionRetryable(requestId, leaseId, "DATABASE_DELETE_FAILED");
    return false;
  }
}

async function runAuthPhase(requestId: string, leaseId: string, authUserId: string, encryptedEmail: string | null) {
  const begun = await transition(requestId, leaseId, ["AUTH_PENDING", "AUTH_DELETE_RETRY", "FAILED_RETRYABLE"], {
    stage: "AUTH_PENDING", safeErrorCode: null,
  });
  if (!begun) return;

  const admin = createSupabaseAdminClient();
  if (!admin) return markDeletionRetryable(requestId, leaseId, "AUTH_CONFIGURATION", "AUTH_DELETE_RETRY");
  const { error } = await admin.auth.admin.deleteUser(authUserId);
  // A missing Auth user safely reconciles the response-loss boundary only after
  // this operation has completed its own database tombstone phase.
  if (error && statusFromUnknown(error) !== 404) {
    return markDeletionRetryable(requestId, leaseId, "AUTH_DELETE_FAILED", "AUTH_DELETE_RETRY");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const completed = await tx.accountDeletionRequest.updateMany({
      where: { id: requestId, executionLeaseId: leaseId, stage: "AUTH_PENDING" },
      data: {
        stage: "COMPLETED", authCompletedAt: now, completedAt: now, purgeAfter: new Date(now.getTime() + receiptRetentionMs),
        safeErrorCode: null, verificationHash: null, verificationExpiresAt: null, encryptedAuthUserId: null,
        executionLeaseId: null, executionLeaseExpiresAt: null, nextAttemptAt: null,
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
}

async function transition(requestId: string, leaseId: string, from: AccountDeletionStage[], data: Prisma.AccountDeletionRequestUpdateManyMutationInput) {
  const updated = await prisma.accountDeletionRequest.updateMany({
    where: { id: requestId, executionLeaseId: leaseId, stage: { in: from } },
    data,
  });
  return updated.count === 1;
}

async function markDeletionRetryable(requestId: string, leaseId: string, safeErrorCode: string, stage: AccountDeletionStage = "FAILED_RETRYABLE") {
  await prisma.accountDeletionRequest.updateMany({
    where: { id: requestId, executionLeaseId: leaseId, stage: { notIn: ["COMPLETED", "FAILED_FINAL"] } },
    data: { stage, safeErrorCode, nextAttemptAt: new Date(Date.now() + leaseLifetimeMs), executionLeaseId: null, executionLeaseExpiresAt: null },
  });
}

async function markDeletionFinal(requestId: string, leaseId: string, safeErrorCode: string) {
  await prisma.accountDeletionRequest.updateMany({
    where: { id: requestId, executionLeaseId: leaseId, stage: { not: "COMPLETED" } },
    data: { stage: "FAILED_FINAL", safeErrorCode, executionLeaseId: null, executionLeaseExpiresAt: null, nextAttemptAt: null },
  });
}

async function deliverCompletionEmailOutbox(input: { limit: number }) {
  for (let index = 0; index < input.limit; index += 1) {
    const now = new Date();
    const outbox = await prisma.accountDeletionEmailOutbox.findFirst({
      where: { status: { in: ["PENDING", "RETRYABLE"] }, OR: [{ executionLeaseExpiresAt: null }, { executionLeaseExpiresAt: { lte: now } }] },
      orderBy: { createdAt: "asc" },
    });
    if (!outbox) return;
    const leaseId = randomUUID();
    const claimed = await prisma.accountDeletionEmailOutbox.updateMany({
      where: { id: outbox.id, status: { in: ["PENDING", "RETRYABLE"] }, OR: [{ executionLeaseExpiresAt: null }, { executionLeaseExpiresAt: { lte: now } }] },
      data: { executionLeaseId: leaseId, executionLeaseExpiresAt: new Date(now.getTime() + leaseLifetimeMs), attemptCount: { increment: 1 }, lastAttemptAt: now },
    });
    if (!claimed.count || !outbox.recipientCiphertext) continue;
    try {
      await sendAccountDeletionCompletedEmail({ to: decryptAccountDeletionValue(outbox.recipientCiphertext), idempotencyKey: outbox.id });
      await prisma.$transaction(async (tx) => {
        await tx.accountDeletionEmailOutbox.updateMany({
          where: { id: outbox.id, executionLeaseId: leaseId },
          data: { status: "SENT", sentAt: new Date(), recipientCiphertext: null, executionLeaseId: null, executionLeaseExpiresAt: null, safeErrorCode: null },
        });
        await tx.accountDeletionRequest.updateMany({ where: { id: outbox.accountDeletionRequestId }, data: { encryptedEmail: null } });
      });
    } catch {
      await prisma.accountDeletionEmailOutbox.updateMany({
        where: { id: outbox.id, executionLeaseId: leaseId },
        data: { status: "RETRYABLE", safeErrorCode: "COMPLETION_EMAIL_FAILED", executionLeaseId: null, executionLeaseExpiresAt: null },
      });
    }
  }
}

async function purgeCompletedDeletionReceipts() {
  await prisma.accountDeletionRequest.deleteMany({
    where: { stage: "COMPLETED", purgeAfter: { lte: new Date() }, emailOutbox: { none: { status: { in: ["PENDING", "RETRYABLE"] } } } },
  });
}

async function deleteVehicleImages(imagePaths: string[]) {
  if (!imagePaths.length) return;
  const admin = createSupabaseAdminClient();
  if (!admin) throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
  const { error } = await admin.storage.from(vehicleImagesBucket).remove(Array.from(new Set(imagePaths)));
  // Storage treats an already-absent object as an idempotent delete success.
  if (error && statusFromUnknown(error) !== 404) throw new AccountDeletionError("ACCOUNT_DELETION_STORAGE_FAILED");
}

function statusFromUnknown(error: unknown) {
  if (typeof error !== "object" || !error) return null;
  const candidate = error as { status?: unknown; statusCode?: unknown };
  return typeof candidate.status === "number" ? candidate.status : typeof candidate.statusCode === "number" ? candidate.statusCode : null;
}
