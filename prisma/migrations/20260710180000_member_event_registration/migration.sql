-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('PUBLIC_ANONYMOUS', 'MEMBER_ACCOUNT', 'ADMIN_CREATED');

-- AlterTable
ALTER TABLE "Registration"
ADD COLUMN "userId" UUID,
ADD COLUMN "vehicleId" TEXT,
ADD COLUMN "registrationSource" "RegistrationSource" NOT NULL DEFAULT 'PUBLIC_ANONYMOUS';

-- CreateIndex
CREATE INDEX "Registration_userId_deletedAt_idx" ON "Registration"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Registration_vehicleId_idx" ON "Registration"("vehicleId");

-- CreateIndex
CREATE INDEX "Registration_eventId_userId_deletedAt_idx" ON "Registration"("eventId", "userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_member_active_package_key"
ON "Registration" ("userId", "eventId", "packageId")
WHERE
  "userId" IS NOT NULL
  AND "deletedAt" IS NULL
  AND "status" IN ('PENDING_PAYMENT', 'CONFIRMED');

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
