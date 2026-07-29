-- Durable metadata prevents a provider's idempotency-window expiry from
-- turning a recovery retry into a second account-deletion completion email.
ALTER TYPE "AccountDeletionOutboxStatus" ADD VALUE 'RECONCILIATION_REQUIRED';

ALTER TABLE "AccountDeletionRequest"
  ADD COLUMN "authProviderIdentity" TEXT;

ALTER TABLE "AccountDeletionEmailOutbox"
  ADD COLUMN "deliveryPayloadCiphertext" TEXT,
  ADD COLUMN "deliveryPayloadFingerprint" TEXT,
  ADD COLUMN "deliveryFirstTransportAt" TIMESTAMP(3),
  ADD COLUMN "deliveryRetryDeadlineAt" TIMESTAMP(3),
  ADD COLUMN "providerMessageId" TEXT,
  ADD COLUMN "reconciliationRequiredAt" TIMESTAMP(3);
