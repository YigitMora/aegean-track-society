-- CreateEnum
CREATE TYPE "ModificationCategory" AS ENUM ('ENGINE', 'ECU', 'COOLING', 'INTAKE_EXHAUST', 'SUSPENSION', 'BRAKES', 'TYRES', 'WHEELS', 'DRIVETRAIN', 'AERO', 'SAFETY', 'OTHER');

-- CreateEnum
CREATE TYPE "ModificationRuleType" AS ENUM ('CONFLICTS_WITH', 'REQUIRES');

-- CreateTable
CREATE TABLE "ModificationDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" "ModificationCategory" NOT NULL,
    "brand" TEXT,
    "name" TEXT NOT NULL,
    "variant" TEXT,
    "description" TEXT,
    "powerImpact" INTEGER NOT NULL DEFAULT 0,
    "handlingImpact" INTEGER NOT NULL DEFAULT 0,
    "brakingImpact" INTEGER NOT NULL DEFAULT 0,
    "reliabilityImpact" INTEGER NOT NULL DEFAULT 0,
    "trackReadinessImpact" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModificationDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModification" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "modificationDefinitionId" TEXT NOT NULL,
    "customNotes" TEXT,
    "installedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModificationRule" (
    "id" TEXT NOT NULL,
    "sourceDefinitionId" TEXT NOT NULL,
    "targetDefinitionId" TEXT NOT NULL,
    "ruleType" "ModificationRuleType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModificationRequirementGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sourceDefinitionId" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModificationRequirementGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModificationRequirementOption" (
    "id" TEXT NOT NULL,
    "requirementGroupId" TEXT NOT NULL,
    "requiredDefinitionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModificationRequirementOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModificationCompatibility" (
    "id" TEXT NOT NULL,
    "modificationDefinitionId" TEXT NOT NULL,
    "vehicleBrand" TEXT,
    "vehicleModel" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ModificationCompatibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModificationDefinition_code_key" ON "ModificationDefinition"("code");

-- CreateIndex
CREATE INDEX "ModificationDefinition_category_active_sortOrder_idx" ON "ModificationDefinition"("category", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "ModificationDefinition_brand_name_idx" ON "ModificationDefinition"("brand", "name");

-- CreateIndex
CREATE INDEX "VehicleModification_vehicleId_deletedAt_idx" ON "VehicleModification"("vehicleId", "deletedAt");

-- CreateIndex
CREATE INDEX "VehicleModification_modificationDefinitionId_idx" ON "VehicleModification"("modificationDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModification_active_definition_key"
ON "VehicleModification" ("vehicleId", "modificationDefinitionId")
WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ModificationRule_sourceDefinitionId_targetDefinitionId_ruleType_key" ON "ModificationRule"("sourceDefinitionId", "targetDefinitionId", "ruleType");

-- CreateIndex
CREATE INDEX "ModificationRule_sourceDefinitionId_active_idx" ON "ModificationRule"("sourceDefinitionId", "active");

-- CreateIndex
CREATE INDEX "ModificationRule_targetDefinitionId_active_idx" ON "ModificationRule"("targetDefinitionId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ModificationRequirementGroup_code_key" ON "ModificationRequirementGroup"("code");

-- CreateIndex
CREATE INDEX "ModificationRequirementGroup_sourceDefinitionId_active_idx" ON "ModificationRequirementGroup"("sourceDefinitionId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ModificationRequirementOption_requirementGroupId_requiredDefinitionId_key" ON "ModificationRequirementOption"("requirementGroupId", "requiredDefinitionId");

-- CreateIndex
CREATE INDEX "ModificationRequirementOption_requiredDefinitionId_idx" ON "ModificationRequirementOption"("requiredDefinitionId");

-- CreateIndex
CREATE INDEX "ModificationCompatibility_modificationDefinitionId_active_idx" ON "ModificationCompatibility"("modificationDefinitionId", "active");

-- CreateIndex
CREATE INDEX "ModificationCompatibility_vehicleBrand_vehicleModel_active_idx" ON "ModificationCompatibility"("vehicleBrand", "vehicleModel", "active");

-- AddForeignKey
ALTER TABLE "VehicleModification" ADD CONSTRAINT "VehicleModification_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModification" ADD CONSTRAINT "VehicleModification_modificationDefinitionId_fkey" FOREIGN KEY ("modificationDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationRule" ADD CONSTRAINT "ModificationRule_sourceDefinitionId_fkey" FOREIGN KEY ("sourceDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationRule" ADD CONSTRAINT "ModificationRule_targetDefinitionId_fkey" FOREIGN KEY ("targetDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationRequirementGroup" ADD CONSTRAINT "ModificationRequirementGroup_sourceDefinitionId_fkey" FOREIGN KEY ("sourceDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationRequirementOption" ADD CONSTRAINT "ModificationRequirementOption_requirementGroupId_fkey" FOREIGN KEY ("requirementGroupId") REFERENCES "ModificationRequirementGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationRequirementOption" ADD CONSTRAINT "ModificationRequirementOption_requiredDefinitionId_fkey" FOREIGN KEY ("requiredDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationCompatibility" ADD CONSTRAINT "ModificationCompatibility_modificationDefinitionId_fkey" FOREIGN KEY ("modificationDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
