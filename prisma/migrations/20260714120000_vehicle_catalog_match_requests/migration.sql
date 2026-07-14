-- CreateEnum
CREATE TYPE "VehicleCatalogMatchRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "VehicleCatalogMatchRequest" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "vehicleId" TEXT,
    "status" "VehicleCatalogMatchRequestStatus" NOT NULL DEFAULT 'PENDING',
    "memberNote" TEXT,
    "adminNote" TEXT,
    "resolvedByAdminUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "memberNotifiedAt" TIMESTAMP(3),
    "adminNotificationEmailSentAt" TIMESTAMP(3),
    "adminNotificationEmailFailedAt" TIMESTAMP(3),
    "memberNotificationEmailSentAt" TIMESTAMP(3),
    "memberNotificationEmailFailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCatalogMatchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleCatalogMatchRequest_vehicleId_idx" ON "VehicleCatalogMatchRequest"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleCatalogMatchRequest_userId_idx" ON "VehicleCatalogMatchRequest"("userId");

-- CreateIndex
CREATE INDEX "VehicleCatalogMatchRequest_status_idx" ON "VehicleCatalogMatchRequest"("status");

-- CreateIndex
CREATE INDEX "VehicleCatalogMatchRequest_createdAt_idx" ON "VehicleCatalogMatchRequest"("createdAt");

-- CreateIndex
CREATE INDEX "VehicleCatalogMatchRequest_updatedAt_idx" ON "VehicleCatalogMatchRequest"("updatedAt");

-- CreateIndex
CREATE INDEX "VehicleCatalogMatchRequest_resolvedByAdminUserId_idx" ON "VehicleCatalogMatchRequest"("resolvedByAdminUserId");

-- AddForeignKey
ALTER TABLE "VehicleCatalogMatchRequest" ADD CONSTRAINT "VehicleCatalogMatchRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCatalogMatchRequest" ADD CONSTRAINT "VehicleCatalogMatchRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCatalogMatchRequest" ADD CONSTRAINT "VehicleCatalogMatchRequest_resolvedByAdminUserId_fkey" FOREIGN KEY ("resolvedByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
