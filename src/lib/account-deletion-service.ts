import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { vehicleImagesBucket } from "@/lib/vehicle-images";
import { sendAccountDeletionVerificationEmail } from "@/lib/account-deletion-email";
import {
  AccountDeletionError,
  accountDeletionHash,
  equalAccountDeletionHash,
} from "@/lib/mobile-account-deletion-contract";

const verificationLifetimeMs = 10 * 60 * 1000;
const resendCooldownMs = 60 * 1000;
const maxResends = 3;
const maxVerificationAttempts = 5;

export async function startAccountDeletionVerification(input: { authUserId: string; email: string }) {
  const authUserIdHash = accountDeletionHash(input.authUserId);
  const now = new Date();
  const existing = await prisma.accountDeletionRequest.findUnique({ where: { authUserIdHash } });

  if (existing?.legalHold) throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  if (existing?.stage === "COMPLETED") throw new AccountDeletionError("ACCOUNT_DELETION_NOT_READY");
  if (
    existing?.stage === "AUTH_DELETE_RETRY" ||
    existing?.stage === "AUTH_PENDING" ||
    existing?.stage === "FAILED_FINAL"
  ) {
    throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  }
  if (existing?.lastSentAt && now.getTime() - existing.lastSentAt.getTime() < resendCooldownMs) {
    throw new AccountDeletionError("ACCOUNT_DELETION_VERIFICATION_LIMITED");
  }
  if (existing && existing.resendCount >= maxResends) throw new AccountDeletionError("ACCOUNT_DELETION_VERIFICATION_LIMITED");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const verificationHash = accountDeletionHash(`${input.authUserId}:${code}`);
  await prisma.accountDeletionRequest.upsert({
    where: { authUserIdHash },
    update: {
      stage: "VERIFICATION_PENDING",
      verificationHash,
      verificationExpiresAt: new Date(now.getTime() + verificationLifetimeMs),
      verificationAttempts: 0,
      resendCount: { increment: 1 },
      lastSentAt: now,
      safeErrorCode: null,
    },
    create: {
      authUserIdHash,
      verificationHash,
      verificationExpiresAt: new Date(now.getTime() + verificationLifetimeMs),
      verificationAttempts: 0,
      resendCount: 1,
      lastSentAt: now,
    },
  });

  try {
    await sendAccountDeletionVerificationEmail({ to: input.email, code });
  } catch {
    await prisma.accountDeletionRequest.update({ where: { authUserIdHash }, data: { safeErrorCode: "EMAIL_DELIVERY_FAILED" } });
    throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
  }

  return { data: { status: "verification_sent" as const } };
}

export async function confirmAccountDeletion(input: {
  authUserId: string;
  verificationCode: string;
  idempotencyKey: string;
}) {
  const authUserIdHash = accountDeletionHash(input.authUserId);
  const idempotencyKeyHash = accountDeletionHash(input.idempotencyKey);
  const request = await prisma.accountDeletionRequest.findUnique({ where: { authUserIdHash } });
  if (!request) throw new AccountDeletionError("ACCOUNT_DELETION_NOT_READY");
  if (request.legalHold || request.stage === "FAILED_FINAL") {
    throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  }
  if (request.stage === "COMPLETED") return { data: { status: "completed" as const } };
  if (request.idempotencyKeyHash && request.idempotencyKeyHash !== idempotencyKeyHash) {
    throw new AccountDeletionError("ACCOUNT_DELETION_IN_PROGRESS");
  }
  if (request.stage === "AUTH_DELETE_RETRY" || request.stage === "AUTH_PENDING") {
    await finalizeSupabaseAuthDeletion({ requestId: request.id, authUserId: input.authUserId });
    return { data: { status: "completed" as const } };
  }
  if (
    request.stage === "VERIFIED" ||
    request.stage === "STORAGE_PENDING" ||
    request.stage === "DATABASE_PENDING" ||
    request.stage === "FAILED_RETRYABLE"
  ) {
    if (!request.idempotencyKeyHash) throw new AccountDeletionError("ACCOUNT_DELETION_NOT_READY");
    await deleteAccountData({ authUserId: input.authUserId, authUserIdHash });
    return { data: { status: "completed" as const } };
  }
  if (!request.verificationHash || !request.verificationExpiresAt) throw new AccountDeletionError("ACCOUNT_DELETION_NOT_READY");
  if (request.verificationAttempts >= maxVerificationAttempts || request.verificationExpiresAt <= new Date()) throw new AccountDeletionError("ACCOUNT_DELETION_VERIFICATION_INVALID");
  if (!equalAccountDeletionHash(request.verificationHash, `${input.authUserId}:${input.verificationCode}`)) {
    await prisma.accountDeletionRequest.update({ where: { authUserIdHash }, data: { verificationAttempts: { increment: 1 } } });
    throw new AccountDeletionError("ACCOUNT_DELETION_VERIFICATION_INVALID");
  }

  await prisma.accountDeletionRequest.update({ where: { authUserIdHash }, data: {
    stage: "VERIFIED", idempotencyKeyHash, verificationHash: null, verificationExpiresAt: null,
  } });
  await deleteAccountData({ authUserId: input.authUserId, authUserIdHash });
  return { data: { status: "completed" as const } };
}

export async function getAccountDeletionStatus(authUserId: string) {
  const request = await prisma.accountDeletionRequest.findUnique({ where: { authUserIdHash: accountDeletionHash(authUserId) }, select: { stage: true } });
  return { data: { status: request?.stage === "COMPLETED" ? "completed" : request?.stage ?? "none" } };
}

async function deleteAccountData(input: { authUserId: string; authUserIdHash: string }) {
  const request = await prisma.accountDeletionRequest.update({ where: { authUserIdHash: input.authUserIdHash }, data: { stage: "STORAGE_PENDING" } });
  try {
    const vehicles = await prisma.vehicle.findMany({ where: { userId: input.authUserId }, select: { imagePath: true } });
    const imagePaths = vehicles.flatMap((vehicle) => vehicle.imagePath ? [vehicle.imagePath] : []);
    if (imagePaths.some((path) => !path.startsWith(`${input.authUserId}/`))) {
      await prisma.accountDeletionRequest.update({ where: { id: request.id }, data: { stage: "FAILED_FINAL", safeErrorCode: "STORAGE_PATH_INVALID" } });
      throw new AccountDeletionError("ACCOUNT_DELETION_STORAGE_FAILED");
    }
    await deleteVehicleImages(imagePaths);
    await prisma.accountDeletionRequest.update({ where: { id: request.id }, data: { storageCompletedAt: new Date(), stage: "DATABASE_PENDING", safeErrorCode: null } });
  } catch (error) {
    if (error instanceof AccountDeletionError && error.code === "ACCOUNT_DELETION_STORAGE_FAILED") throw error;
    await markDeletionRetryable(request.id, "STORAGE_DELETE_FAILED");
    throw error instanceof AccountDeletionError ? error : new AccountDeletionError("ACCOUNT_DELETION_RETRY_REQUIRED");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const registrations = await tx.registration.findMany({ where: { userId: input.authUserId }, select: { id: true } });
      const registrationIds = registrations.map((registration) => registration.id);
      const vehiclesForDelete = await tx.vehicle.findMany({ where: { userId: input.authUserId }, select: { id: true } });
      const vehicleIds = vehiclesForDelete.map((vehicle) => vehicle.id);
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
      await tx.vehicleCatalogMatchRequest.deleteMany({ where: { userId: input.authUserId } });
      await tx.vehicleModification.deleteMany({ where: { vehicleId: { in: vehicleIds } } });
      await tx.vehicle.deleteMany({ where: { id: { in: vehicleIds } } });
      await tx.memberProfile.deleteMany({ where: { userId: input.authUserId } });
      // Keep a non-operational tombstone until Auth deletion succeeds. This blocks
      // every provisioning path during an AUTH_DELETE_RETRY without retaining PII.
      await tx.user.update({ where: { id: input.authUserId }, data: {
        status: "DELETION_PENDING",
        email: `deleted-${input.authUserIdHash.slice(0, 32)}@invalid.local`,
        memberKvkkAcceptedAt: null,
        memberTermsAcceptedAt: null,
        memberMarketingConsentAt: null,
        memberMarketingConsentRevokedAt: null,
        memberConsentIpAddress: null,
        deletedAt: new Date(),
      } });
      await tx.accountDeletionRequest.update({ where: { id: request.id }, data: { databaseCompletedAt: new Date(), stage: "AUTH_PENDING", safeErrorCode: null } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await markDeletionRetryable(request.id, "DATABASE_DELETE_FAILED");
    throw new AccountDeletionError("ACCOUNT_DELETION_RETRY_REQUIRED");
  }

  await finalizeSupabaseAuthDeletion({ requestId: request.id, authUserId: input.authUserId });
}

async function markDeletionRetryable(requestId: string, safeErrorCode: string) {
  await prisma.accountDeletionRequest.update({
    where: { id: requestId },
    data: { stage: "FAILED_RETRYABLE", safeErrorCode },
  });
}

async function finalizeSupabaseAuthDeletion(input: { requestId: string; authUserId: string }) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    await prisma.accountDeletionRequest.update({ where: { id: input.requestId }, data: { stage: "AUTH_DELETE_RETRY", safeErrorCode: "AUTH_CONFIGURATION" } });
    throw new AccountDeletionError("ACCOUNT_DELETION_RETRY_REQUIRED");
  }
  const { error } = await admin.auth.admin.deleteUser(input.authUserId);
  if (error) {
    await prisma.accountDeletionRequest.update({ where: { id: input.requestId }, data: { stage: "AUTH_DELETE_RETRY", safeErrorCode: "AUTH_DELETE_FAILED" } });
    throw new AccountDeletionError("ACCOUNT_DELETION_RETRY_REQUIRED");
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.deleteMany({ where: { id: input.authUserId, status: "DELETION_PENDING" } });
    await tx.accountDeletionRequest.update({ where: { id: input.requestId }, data: { stage: "COMPLETED", authCompletedAt: new Date(), completedAt: new Date(), safeErrorCode: null, verificationHash: null } });
  });
}

async function deleteVehicleImages(imagePaths: string[]) {
  if (!imagePaths.length) return;
  const admin = createSupabaseAdminClient();
  if (!admin) throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
  const { error } = await admin.storage.from(vehicleImagesBucket).remove(Array.from(new Set(imagePaths)));
  if (error) throw new AccountDeletionError("ACCOUNT_DELETION_STORAGE_FAILED");
}
