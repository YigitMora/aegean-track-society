-- Account deletion is a resumable, server-side workflow. This migration does not
-- backfill or delete existing production data.
ALTER TYPE "MemberStatus" ADD VALUE IF NOT EXISTS 'DELETION_PENDING';

CREATE TYPE "AccountDeletionStage" AS ENUM (
  'VERIFICATION_PENDING',
  'VERIFIED',
  'STORAGE_PENDING',
  'DATABASE_PENDING',
  'AUTH_PENDING',
  'AUTH_DELETE_RETRY',
  'COMPLETED',
  'FAILED_RETRYABLE',
  'FAILED_FINAL'
);

CREATE TABLE "AccountDeletionRequest" (
  "id" TEXT NOT NULL,
  "authUserIdHash" TEXT NOT NULL,
  "stage" "AccountDeletionStage" NOT NULL DEFAULT 'VERIFICATION_PENDING',
  "verificationHash" TEXT,
  "verificationExpiresAt" TIMESTAMP(3),
  "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
  "resendCount" INTEGER NOT NULL DEFAULT 0,
  "lastSentAt" TIMESTAMP(3),
  "idempotencyKeyHash" TEXT,
  "legalHold" BOOLEAN NOT NULL DEFAULT false,
  "legalHoldReason" TEXT,
  "legalHoldUntil" TIMESTAMP(3),
  "safeErrorCode" TEXT,
  "storageCompletedAt" TIMESTAMP(3),
  "databaseCompletedAt" TIMESTAMP(3),
  "authCompletedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountDeletionRequest_authUserIdHash_key" ON "AccountDeletionRequest"("authUserIdHash");
CREATE UNIQUE INDEX "AccountDeletionRequest_idempotencyKeyHash_key" ON "AccountDeletionRequest"("idempotencyKeyHash");
CREATE INDEX "AccountDeletionRequest_stage_idx" ON "AccountDeletionRequest"("stage");
CREATE INDEX "AccountDeletionRequest_verificationExpiresAt_idx" ON "AccountDeletionRequest"("verificationExpiresAt");
CREATE INDEX "AccountDeletionRequest_completedAt_idx" ON "AccountDeletionRequest"("completedAt");
