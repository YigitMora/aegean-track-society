-- CreateTable
CREATE TABLE "ModificationDefinitionPowertrain" (
    "id" TEXT NOT NULL,
    "modificationDefinitionId" TEXT NOT NULL,
    "powertrain" "VehiclePowertrain" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModificationDefinitionPowertrain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModificationDefinitionPowertrain_modificationDefinitionId_powertrain_key" ON "ModificationDefinitionPowertrain"("modificationDefinitionId", "powertrain");

-- CreateIndex
CREATE INDEX "ModificationDefinitionPowertrain_powertrain_active_idx" ON "ModificationDefinitionPowertrain"("powertrain", "active");

-- CreateIndex
CREATE INDEX "ModificationDefinitionPowertrain_modificationDefinitionId_active_idx" ON "ModificationDefinitionPowertrain"("modificationDefinitionId", "active");

-- AddForeignKey
ALTER TABLE "ModificationDefinitionPowertrain" ADD CONSTRAINT "ModificationDefinitionPowertrain_modificationDefinitionId_fkey" FOREIGN KEY ("modificationDefinitionId") REFERENCES "ModificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
