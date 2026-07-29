CREATE TYPE "AccountDeletionOutboxStatus" AS ENUM ('PENDING', 'RETRYABLE', 'SENT', 'FAILED_FINAL');

ALTER TABLE "AccountDeletionRequest"
  ADD COLUMN "operationReceiptHash" TEXT,
  ADD COLUMN "encryptedAuthUserId" TEXT,
  ADD COLUMN "encryptedEmail" TEXT,
  ADD COLUMN "executionLeaseId" TEXT,
  ADD COLUMN "executionLeaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "operationVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "purgeAfter" TIMESTAMP(3);

CREATE UNIQUE INDEX "AccountDeletionRequest_operationReceiptHash_key" ON "AccountDeletionRequest"("operationReceiptHash");
CREATE INDEX "AccountDeletionRequest_stage_nextAttemptAt_idx" ON "AccountDeletionRequest"("stage", "nextAttemptAt");
CREATE INDEX "AccountDeletionRequest_executionLeaseExpiresAt_idx" ON "AccountDeletionRequest"("executionLeaseExpiresAt");

CREATE TABLE "AccountDeletionEmailOutbox" (
  "id" TEXT NOT NULL,
  "accountDeletionRequestId" TEXT NOT NULL,
  "status" "AccountDeletionOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "recipientCiphertext" TEXT,
  "executionLeaseId" TEXT,
  "executionLeaseExpiresAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "safeErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountDeletionEmailOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountDeletionEmailOutbox_accountDeletionRequestId_key" ON "AccountDeletionEmailOutbox"("accountDeletionRequestId");
CREATE INDEX "AccountDeletionEmailOutbox_status_executionLeaseExpiresAt_idx" ON "AccountDeletionEmailOutbox"("status", "executionLeaseExpiresAt");
ALTER TABLE "AccountDeletionEmailOutbox" ADD CONSTRAINT "AccountDeletionEmailOutbox_accountDeletionRequestId_fkey" FOREIGN KEY ("accountDeletionRequestId") REFERENCES "AccountDeletionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
