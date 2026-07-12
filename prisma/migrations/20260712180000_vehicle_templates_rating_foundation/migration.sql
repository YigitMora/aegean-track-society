-- CreateEnum
CREATE TYPE "VehiclePowertrain" AS ENUM ('ICE', 'HYBRID', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "VehicleDrivetrain" AS ENUM ('FWD', 'RWD', 'AWD');

-- CreateEnum
CREATE TYPE "VehicleRatingStatus" AS ENUM ('CALIBRATED', 'PROVISIONAL', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "VehicleDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generation" TEXT,
    "chassisCode" TEXT,
    "variant" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "powertrain" "VehiclePowertrain" NOT NULL,
    "drivetrain" "VehicleDrivetrain" NOT NULL,
    "powerRating" INTEGER NOT NULL,
    "handlingRating" INTEGER NOT NULL,
    "brakingRating" INTEGER NOT NULL,
    "reliabilityRating" INTEGER NOT NULL,
    "thermalRating" INTEGER NOT NULL,
    "trackReadinessRating" INTEGER NOT NULL,
    "weightPenalty" INTEGER NOT NULL DEFAULT 0,
    "ratingStatus" "VehicleRatingStatus" NOT NULL DEFAULT 'PROVISIONAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModificationImpact" (
    "id" TEXT NOT NULL,
    "vehicleDefinitionId" TEXT NOT NULL,
    "modificationDefinitionId" TEXT NOT NULL,
    "powerImpact" INTEGER NOT NULL DEFAULT 0,
    "handlingImpact" INTEGER NOT NULL DEFAULT 0,
    "brakingImpact" INTEGER NOT NULL DEFAULT 0,
    "reliabilityImpact" INTEGER NOT NULL DEFAULT 0,
    "thermalImpact" INTEGER NOT NULL DEFAULT 0,
    "trackReadinessImpact" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VehicleModificationImpact_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "vehicleDefinitionId" TEXT;

-- AlterTable
ALTER TABLE "ModificationCompatibility" ADD COLUMN "vehicleDefinitionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDefinition_code_key" ON "VehicleDefinition"("code");

-- CreateIndex
CREATE INDEX "VehicleDefinition_brand_model_active_idx" ON "VehicleDefinition"("brand", "model", "active");

-- CreateIndex
CREATE INDEX "VehicleDefinition_generation_variant_active_idx" ON "VehicleDefinition"("generation", "variant", "active");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModificationImpact_vehicleDefinitionId_modificationDefinitionId_key" ON "VehicleModificationImpact"("vehicleDefinitionId", "modificationDefinitionId");

-- CreateIndex
CREATE INDEX "VehicleModificationImpact_modificationDefinitionId_active_idx" ON "VehicleModificationImpact"("modificationDefinitionId", "active");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleDefinitionId_idx" ON "Vehicle"("vehicleDefinitionId");

-- CreateIndex
CREATE INDEX "ModificationCompatibility_vehicleDefinitionId_active_idx" ON "ModificationCompatibility"("vehicleDefinitionId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ModificationCompatibility_modificationDefinitionId_vehicleDefinitionId_key" ON "ModificationCompatibility"("modificationDefinitionId", "vehicleDefinitionId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehicleDefinitionId_fkey" FOREIGN KEY ("vehicleDefinitionId") REFERENCES "VehicleDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModificationImpact" ADD CONSTRAINT "VehicleModificationImpact_vehicleDefinitionId_fkey" FOREIGN KEY ("vehicleDefinitionId") REFERENCES "VehicleDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModificationImpact" ADD CONSTRAINT "VehicleModificationImpact_modificationDefinitionId_fkey" FOREIGN KEY ("modificationDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationCompatibility" ADD CONSTRAINT "ModificationCompatibility_vehicleDefinitionId_fkey" FOREIGN KEY ("vehicleDefinitionId") REFERENCES "VehicleDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
