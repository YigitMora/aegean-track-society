-- Add CRM registration states and email event types.
ALTER TYPE "RegistrationStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'REGISTRATION_RECEIVED';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'ADMIN_NEW_REGISTRATION';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'REGISTRATION_APPROVED';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'REGISTRATION_REJECTED';

-- Soft archive metadata for registrations.
ALTER TABLE "Registration"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedByAdminId" TEXT,
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "Registration"
  ADD CONSTRAINT "Registration_deletedByAdminId_fkey"
  FOREIGN KEY ("deletedByAdminId") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Registration_deletedAt_idx" ON "Registration"("deletedAt");
CREATE INDEX "Registration_status_deletedAt_idx" ON "Registration"("status", "deletedAt");
CREATE INDEX "Registration_deletedByAdminId_idx" ON "Registration"("deletedByAdminId");

-- Internal admin note timeline.
CREATE TABLE "AdminNote" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "adminUserId" TEXT,
  "authorLabel" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AdminNote"
  ADD CONSTRAINT "AdminNote_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminNote"
  ADD CONSTRAINT "AdminNote_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AdminNote_registrationId_createdAt_idx" ON "AdminNote"("registrationId", "createdAt");
CREATE INDEX "AdminNote_adminUserId_idx" ON "AdminNote"("adminUserId");
