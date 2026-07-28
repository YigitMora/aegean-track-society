-- Invocation state fences worker generations around external deletion effects.
-- NULL preserves the recoverable state of requests created before this migration.
CREATE TYPE "AccountDeletionSideEffectInvocationState" AS ENUM (
  'RESERVED',
  'INVOKING',
  'RECONCILING',
  'SUCCEEDED',
  'RETRYABLE'
);

ALTER TABLE "AccountDeletionRequest"
  ADD COLUMN "storageInvocationKey" TEXT,
  ADD COLUMN "storageInvocationState" "AccountDeletionSideEffectInvocationState",
  ADD COLUMN "storageInvocationStartedAt" TIMESTAMP(3),
  ADD COLUMN "storageInvocationTarget" JSONB,
  ADD COLUMN "authInvocationKey" TEXT,
  ADD COLUMN "authInvocationState" "AccountDeletionSideEffectInvocationState",
  ADD COLUMN "authInvocationStartedAt" TIMESTAMP(3);

ALTER TABLE "AccountDeletionEmailOutbox"
  ADD COLUMN "deliveryInvocationKey" TEXT,
  ADD COLUMN "deliveryInvocationState" "AccountDeletionSideEffectInvocationState",
  ADD COLUMN "deliveryInvocationStartedAt" TIMESTAMP(3);

CREATE INDEX "AccountDeletionRequest_storageInvocationState_idx"
  ON "AccountDeletionRequest"("storageInvocationState");
CREATE INDEX "AccountDeletionRequest_authInvocationState_idx"
  ON "AccountDeletionRequest"("authInvocationState");
CREATE INDEX "AccountDeletionEmailOutbox_deliveryInvocationState_idx"
  ON "AccountDeletionEmailOutbox"("deliveryInvocationState");
