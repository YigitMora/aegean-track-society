-- Member profile onboarding and account-level consent fields.
ALTER TABLE "User"
  ADD COLUMN "memberKvkkAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "memberTermsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "memberMarketingConsentAt" TIMESTAMP(3),
  ADD COLUMN "memberConsentIpAddress" VARCHAR(45);

ALTER TABLE "MemberProfile"
  ADD COLUMN "emergencyContactName" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "experienceLevel" "ExperienceLevel";
