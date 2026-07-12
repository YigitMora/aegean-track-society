-- CreateEnum
CREATE TYPE "BigBrakeKitAxle" AS ENUM ('FRONT', 'REAR', 'BOTH');

-- CreateEnum
CREATE TYPE "RotorConstruction" AS ENUM ('ONE_PIECE', 'TWO_PIECE_FLOATING');

-- CreateEnum
CREATE TYPE "CaliperType" AS ENUM ('FIXED', 'FLOATING');

-- CreateEnum
CREATE TYPE "TyreClass" AS ENUM ('TOURING', 'UHP_ROAD', 'MAX_PERFORMANCE_ROAD', 'EXTREME_PERFORMANCE', 'TRACKDAY', 'SEMI_SLICK', 'SLICK', 'WET_RACING');

-- CreateEnum
CREATE TYPE "WheelConstruction" AS ENUM ('CAST', 'FLOW_FORMED', 'FORGED', 'MULTI_PIECE');

-- CreateTable
CREATE TABLE "SportSpringSpecification" (
    "id" TEXT NOT NULL,
    "modificationDefinitionId" TEXT NOT NULL,
    "approximateLoweringFrontMm" INTEGER,
    "approximateLoweringRearMm" INTEGER,
    "progressiveRate" BOOLEAN,
    "roadSuitability" INTEGER NOT NULL,
    "trackSuitability" INTEGER NOT NULL,
    "sourceNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportSpringSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BigBrakeKitSpecification" (
    "id" TEXT NOT NULL,
    "modificationDefinitionId" TEXT NOT NULL,
    "frontOrRear" "BigBrakeKitAxle" NOT NULL,
    "pistonCount" INTEGER,
    "rotorDiameterMm" INTEGER,
    "rotorThicknessMm" INTEGER,
    "rotorConstruction" "RotorConstruction",
    "caliperType" "CaliperType",
    "roadSuitability" INTEGER NOT NULL,
    "trackSuitability" INTEGER NOT NULL,
    "thermalCapacity" INTEGER NOT NULL,
    "sourceNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BigBrakeKitSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TyreSpecification" (
    "id" TEXT NOT NULL,
    "modificationDefinitionId" TEXT NOT NULL,
    "tyreClass" "TyreClass" NOT NULL,
    "dryGrip" INTEGER NOT NULL,
    "wetGrip" INTEGER NOT NULL,
    "coldPerformance" INTEGER NOT NULL,
    "heatTolerance" INTEGER NOT NULL,
    "trackConsistency" INTEGER NOT NULL,
    "roadSuitability" INTEGER NOT NULL,
    "wearLongevity" INTEGER NOT NULL,
    "noiseComfort" INTEGER NOT NULL,
    "roadLegal" BOOLEAN,
    "sourceNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TyreSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelSpecification" (
    "id" TEXT NOT NULL,
    "modificationDefinitionId" TEXT NOT NULL,
    "construction" "WheelConstruction" NOT NULL,
    "nominalDiameterInches" INTEGER,
    "nominalWidthInches" DECIMAL(4,1),
    "weightKg" DECIMAL(5,2),
    "trackSuitability" INTEGER NOT NULL,
    "roadSuitability" INTEGER NOT NULL,
    "sourceNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WheelSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SportSpringSpecification_modificationDefinitionId_key" ON "SportSpringSpecification"("modificationDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "BigBrakeKitSpecification_modificationDefinitionId_key" ON "BigBrakeKitSpecification"("modificationDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "TyreSpecification_modificationDefinitionId_key" ON "TyreSpecification"("modificationDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "WheelSpecification_modificationDefinitionId_key" ON "WheelSpecification"("modificationDefinitionId");

-- AddForeignKey
ALTER TABLE "SportSpringSpecification" ADD CONSTRAINT "SportSpringSpecification_modificationDefinitionId_fkey" FOREIGN KEY ("modificationDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BigBrakeKitSpecification" ADD CONSTRAINT "BigBrakeKitSpecification_modificationDefinitionId_fkey" FOREIGN KEY ("modificationDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TyreSpecification" ADD CONSTRAINT "TyreSpecification_modificationDefinitionId_fkey" FOREIGN KEY ("modificationDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelSpecification" ADD CONSTRAINT "WheelSpecification_modificationDefinitionId_fkey" FOREIGN KEY ("modificationDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
