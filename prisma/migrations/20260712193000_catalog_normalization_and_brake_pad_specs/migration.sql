-- CreateEnum
CREATE TYPE "ModificationUsageClass" AS ENUM ('STREET', 'FAST_ROAD', 'STREET_TRACK', 'TRACK', 'ENDURANCE', 'SPRINT', 'RACE');

-- AlterTable
ALTER TABLE "ModificationDefinition"
ADD COLUMN "componentTypeCode" TEXT,
ADD COLUMN "usageClass" "ModificationUsageClass";

-- CreateTable
CREATE TABLE "BrakePadSpecification" (
    "id" TEXT NOT NULL,
    "modificationDefinitionId" TEXT NOT NULL,
    "coldPerformance" INTEGER NOT NULL,
    "hotPerformance" INTEGER NOT NULL,
    "modulation" INTEGER NOT NULL,
    "fadeResistance" INTEGER NOT NULL,
    "endurance" INTEGER NOT NULL,
    "rotorWear" INTEGER NOT NULL,
    "streetSuitability" INTEGER NOT NULL,
    "noiseLevel" INTEGER NOT NULL,
    "minOperatingTempC" INTEGER,
    "maxOperatingTempC" INTEGER,
    "sourceNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrakePadSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModificationDefinition_category_componentTypeCode_active_idx" ON "ModificationDefinition"("category", "componentTypeCode", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BrakePadSpecification_modificationDefinitionId_key" ON "BrakePadSpecification"("modificationDefinitionId");

-- AddForeignKey
ALTER TABLE "BrakePadSpecification" ADD CONSTRAINT "BrakePadSpecification_modificationDefinitionId_fkey" FOREIGN KEY ("modificationDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
