-- Allow members to revoke and later re-enable optional marketing consent.
ALTER TABLE "User"
  ADD COLUMN "memberMarketingConsentRevokedAt" TIMESTAMP(3);
