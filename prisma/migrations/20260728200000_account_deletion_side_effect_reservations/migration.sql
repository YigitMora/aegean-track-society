-- Durable side-effect reservations serialize legal holds with external adapters.
-- Existing rows remain recoverable: NULL means no adapter start has been reserved.
ALTER TABLE "AccountDeletionRequest"
  ADD COLUMN "storageReservationId" TEXT,
  ADD COLUMN "storageReservationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "authReservationId" TEXT,
  ADD COLUMN "authReservationExpiresAt" TIMESTAMP(3);

ALTER TABLE "AccountDeletionEmailOutbox"
  ADD COLUMN "deliveryReservationId" TEXT,
  ADD COLUMN "deliveryReservationExpiresAt" TIMESTAMP(3);

CREATE INDEX "AccountDeletionRequest_storageReservationExpiresAt_idx"
  ON "AccountDeletionRequest"("storageReservationExpiresAt");
CREATE INDEX "AccountDeletionRequest_authReservationExpiresAt_idx"
  ON "AccountDeletionRequest"("authReservationExpiresAt");
CREATE INDEX "AccountDeletionEmailOutbox_deliveryReservationExpiresAt_idx"
  ON "AccountDeletionEmailOutbox"("deliveryReservationExpiresAt");
