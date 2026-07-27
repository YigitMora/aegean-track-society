-- CreateEnum
CREATE TYPE "MyTrackPaymentPreference" AS ENUM ('BANK_TRANSFER', 'CARD_AT_TRACK');

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN "mytrackPaymentPreference" "MyTrackPaymentPreference";

-- CreateIndex
CREATE INDEX "Registration_mytrackPaymentPreference_idx" ON "Registration"("mytrackPaymentPreference");
