-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SOLD_OUT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'REVIEW');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('IYZICO', 'MANUAL', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "ProviderPaymentStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'REVIEW', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'STAFF', 'CHECKIN');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('ELIGIBLE', 'CHECKED_IN', 'BLOCKED', 'VOID');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('CONFIRMATION', 'PAYMENT_FAILED', 'ADMIN_NOTICE');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "participantSequenceNext" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventDay" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPackage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPackageDay" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "eventDayId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPackageDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "participantCode" TEXT,
    "eventId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "carBrandModel" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "experienceLevel" "ExperienceLevel" NOT NULL,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "kvkkAcceptedAt" TIMESTAMP(3) NOT NULL,
    "liabilityWaiverAcceptedAt" TIMESTAMP(3) NOT NULL,
    "marketingConsentAt" TIMESTAMP(3),
    "consentIpAddress" VARCHAR(45),
    "adminNotes" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "qrTokenHash" TEXT,
    "qrIssuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'IYZICO',
    "conversationId" TEXT NOT NULL,
    "iyzicoToken" TEXT,
    "iyzicoPaymentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" "ProviderPaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "rawInitializeResponse" JSONB,
    "rawCallbackResponse" JSONB,
    "rawWebhookPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "checkedInByAdminId" TEXT,
    "status" "CheckInStatus" NOT NULL DEFAULT 'ELIGIBLE',
    "duplicateAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "registrationId" TEXT,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_code_key" ON "Event"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "EventDay_date_idx" ON "EventDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "EventDay_eventId_date_key" ON "EventDay"("eventId", "date");

-- CreateIndex
CREATE INDEX "EventPackage_active_idx" ON "EventPackage"("active");

-- CreateIndex
CREATE UNIQUE INDEX "EventPackage_eventId_code_key" ON "EventPackage"("eventId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "EventPackageDay_packageId_eventDayId_key" ON "EventPackageDay"("packageId", "eventDayId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_participantCode_key" ON "Registration"("participantCode");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_qrTokenHash_key" ON "Registration"("qrTokenHash");

-- CreateIndex
CREATE INDEX "Registration_eventId_status_idx" ON "Registration"("eventId", "status");

-- CreateIndex
CREATE INDEX "Registration_paymentStatus_idx" ON "Registration"("paymentStatus");

-- CreateIndex
CREATE INDEX "Registration_packageId_idx" ON "Registration"("packageId");

-- CreateIndex
CREATE INDEX "Registration_email_idx" ON "Registration"("email");

-- CreateIndex
CREATE INDEX "Registration_phone_idx" ON "Registration"("phone");

-- CreateIndex
CREATE INDEX "Registration_plateNumber_idx" ON "Registration"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_conversationId_key" ON "Payment"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_iyzicoToken_key" ON "Payment"("iyzicoToken");

-- CreateIndex
CREATE INDEX "Payment_registrationId_idx" ON "Payment"("registrationId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_iyzicoPaymentId_idx" ON "Payment"("iyzicoPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "CheckIn_eventDate_status_idx" ON "CheckIn"("eventDate", "status");

-- CreateIndex
CREATE INDEX "CheckIn_checkedInByAdminId_idx" ON "CheckIn"("checkedInByAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_registrationId_eventDate_key" ON "CheckIn"("registrationId", "eventDate");

-- CreateIndex
CREATE INDEX "AuditLog_adminUserId_idx" ON "AuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AuditLog_registrationId_idx" ON "AuditLog"("registrationId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "EmailLog_registrationId_idx" ON "EmailLog"("registrationId");

-- CreateIndex
CREATE INDEX "EmailLog_type_status_idx" ON "EmailLog"("type", "status");

-- AddForeignKey
ALTER TABLE "EventDay" ADD CONSTRAINT "EventDay_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPackage" ADD CONSTRAINT "EventPackage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPackageDay" ADD CONSTRAINT "EventPackageDay_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "EventPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPackageDay" ADD CONSTRAINT "EventPackageDay_eventDayId_fkey" FOREIGN KEY ("eventDayId") REFERENCES "EventDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "EventPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_checkedInByAdminId_fkey" FOREIGN KEY ("checkedInByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
