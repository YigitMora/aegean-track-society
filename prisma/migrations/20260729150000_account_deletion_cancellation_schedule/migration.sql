-- A future-dated server schedule creates an auditable cancellation window.
-- Existing requests remain processable through their existing nextAttemptAt
-- semantics; this migration does not backfill or mutate them.
ALTER TYPE "AccountDeletionStage" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "AccountDeletionRequest"
  ADD COLUMN "scheduledDeletionAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE INDEX "AccountDeletionRequest_stage_scheduledDeletionAt_idx"
  ON "AccountDeletionRequest"("stage", "scheduledDeletionAt");
