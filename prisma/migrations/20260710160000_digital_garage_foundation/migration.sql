-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "plateNumber" TEXT NOT NULL,
    "color" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vehicle_userId_deletedAt_idx" ON "Vehicle"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Vehicle_userId_isPrimary_deletedAt_idx" ON "Vehicle"("userId", "isPrimary", "deletedAt");

-- CreateIndex
CREATE INDEX "Vehicle_plateNumber_idx" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_one_active_primary_per_user"
ON "Vehicle" ("userId")
WHERE "isPrimary" = true AND "deletedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_user_active_plate_key"
ON "Vehicle" ("userId", "plateNumber")
WHERE "deletedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
