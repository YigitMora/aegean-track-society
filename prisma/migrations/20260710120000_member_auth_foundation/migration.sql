-- Member authentication foundation for Supabase Auth-backed ATS members.
CREATE TYPE "MemberRole" AS ENUM ('MEMBER');
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
  "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberProfile" (
  "id" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "fullName" TEXT,
  "displayName" TEXT,
  "phone" TEXT,
  "profileCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE UNIQUE INDEX "MemberProfile_userId_key" ON "MemberProfile"("userId");

ALTER TABLE "MemberProfile"
  ADD CONSTRAINT "MemberProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
