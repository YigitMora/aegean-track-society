-- CreateEnum
CREATE TYPE "EngineInductionType" AS ENUM ('NATURALLY_ASPIRATED', 'TURBOCHARGED', 'SUPERCHARGED', 'TWIN_TURBO');

-- CreateEnum
CREATE TYPE "EngineFuelType" AS ENUM ('PETROL', 'DIESEL', 'FLEX_FUEL', 'HYBRID_PETROL', 'HYBRID_DIESEL');

-- CreateEnum
CREATE TYPE "TuningPackageType" AS ENUM ('ECU_FLASH', 'PIGGYBACK', 'ECU_TCU_BUNDLE', 'TCU_SOFTWARE', 'FLEX_FUEL_CALIBRATION', 'HARDWARE_SOFTWARE_PACKAGE');

-- CreateEnum
CREATE TYPE "PowerMeasurementBasis" AS ENUM ('CRANK', 'WHEEL', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "CalibrationConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "VehiclePlatformFamily" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "generation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehiclePlatformFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleEngineFamily" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displacementCc" INTEGER,
    "cylinderCount" INTEGER,
    "inductionType" "EngineInductionType",
    "fuelType" "EngineFuelType",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleEngineFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TuningPackageSpecification" (
    "id" TEXT NOT NULL,
    "modificationDefinitionId" TEXT NOT NULL,
    "tuneType" "TuningPackageType" NOT NULL,
    "measurementBasis" "PowerMeasurementBasis",
    "claimedPowerMinHp" INTEGER,
    "claimedPowerMaxHp" INTEGER,
    "claimedTorqueMinNm" INTEGER,
    "claimedTorqueMaxNm" INTEGER,
    "minimumFuelOctaneRon" INTEGER,
    "requiredFuelNote" TEXT,
    "hardwareRequirementNote" TEXT,
    "transmissionLimitNote" TEXT,
    "coolingRecommendationNote" TEXT,
    "sourceNote" TEXT,
    "confidence" "CalibrationConfidence" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TuningPackageSpecification_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "VehicleDefinition" ADD COLUMN "platformFamilyId" TEXT;
ALTER TABLE "VehicleDefinition" ADD COLUMN "engineFamilyId" TEXT;

-- AlterTable
ALTER TABLE "ModificationCompatibility" ADD COLUMN "platformFamilyId" TEXT;
ALTER TABLE "ModificationCompatibility" ADD COLUMN "engineFamilyId" TEXT;

-- AlterTable
ALTER TABLE "VehicleModificationImpact" ADD COLUMN "confidence" "CalibrationConfidence" NOT NULL DEFAULT 'LOW';
ALTER TABLE "VehicleModificationImpact" ADD COLUMN "sourceNote" TEXT;
ALTER TABLE "VehicleModificationImpact" ADD COLUMN "claimedPowerDeltaHp" INTEGER;
ALTER TABLE "VehicleModificationImpact" ADD COLUMN "claimedTorqueDeltaNm" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "VehiclePlatformFamily_code_key" ON "VehiclePlatformFamily"("code");

-- CreateIndex
CREATE INDEX "VehiclePlatformFamily_brand_active_idx" ON "VehiclePlatformFamily"("brand", "active");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleEngineFamily_code_key" ON "VehicleEngineFamily"("code");

-- CreateIndex
CREATE INDEX "VehicleEngineFamily_manufacturer_active_idx" ON "VehicleEngineFamily"("manufacturer", "active");

-- CreateIndex
CREATE UNIQUE INDEX "TuningPackageSpecification_modificationDefinitionId_key" ON "TuningPackageSpecification"("modificationDefinitionId");

-- CreateIndex
CREATE INDEX "VehicleDefinition_platformFamilyId_active_idx" ON "VehicleDefinition"("platformFamilyId", "active");

-- CreateIndex
CREATE INDEX "VehicleDefinition_engineFamilyId_active_idx" ON "VehicleDefinition"("engineFamilyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ModificationCompatibility_modificationDefinitionId_platformFamilyId_key" ON "ModificationCompatibility"("modificationDefinitionId", "platformFamilyId");

-- CreateIndex
CREATE UNIQUE INDEX "ModificationCompatibility_modificationDefinitionId_engineFamilyId_key" ON "ModificationCompatibility"("modificationDefinitionId", "engineFamilyId");

-- CreateIndex
CREATE INDEX "ModificationCompatibility_platformFamilyId_active_idx" ON "ModificationCompatibility"("platformFamilyId", "active");

-- CreateIndex
CREATE INDEX "ModificationCompatibility_engineFamilyId_active_idx" ON "ModificationCompatibility"("engineFamilyId", "active");

-- AddForeignKey
ALTER TABLE "VehicleDefinition" ADD CONSTRAINT "VehicleDefinition_platformFamilyId_fkey" FOREIGN KEY ("platformFamilyId") REFERENCES "VehiclePlatformFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDefinition" ADD CONSTRAINT "VehicleDefinition_engineFamilyId_fkey" FOREIGN KEY ("engineFamilyId") REFERENCES "VehicleEngineFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationCompatibility" ADD CONSTRAINT "ModificationCompatibility_platformFamilyId_fkey" FOREIGN KEY ("platformFamilyId") REFERENCES "VehiclePlatformFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationCompatibility" ADD CONSTRAINT "ModificationCompatibility_engineFamilyId_fkey" FOREIGN KEY ("engineFamilyId") REFERENCES "VehicleEngineFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuningPackageSpecification" ADD CONSTRAINT "TuningPackageSpecification_modificationDefinitionId_fkey" FOREIGN KEY ("modificationDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
