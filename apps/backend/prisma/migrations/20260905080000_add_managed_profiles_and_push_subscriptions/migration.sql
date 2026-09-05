-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE "UserAccountStatus" AS ENUM ('MANAGED', 'INVITED', 'ACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RelationshipType" AS ENUM ('PARENT_GUARDIAN', 'CLUB_COACH', 'TEAM_CAPTAIN', 'DELEGATED_COMPANION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RelationshipPermission" AS ENUM ('FULL_MANAGEMENT', 'TOURNAMENT_ONLY', 'VIEW_AND_ALERTS_ONLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Alter User table for managed profiles & login flags
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canLogin" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountStatus" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "claimToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "claimTokenExpires" TIMESTAMP(3);

-- Backfill any existing users
UPDATE "User" SET "canLogin" = true WHERE "canLogin" IS NULL;
UPDATE "User" SET "accountStatus" = 'ACTIVE' WHERE "accountStatus" IS NULL;

-- Unique index on claimToken
CREATE UNIQUE INDEX IF NOT EXISTS "User_claimToken_key" ON "User"("claimToken");

-- 3. Create UserRelationship table
CREATE TABLE IF NOT EXISTS "UserRelationship" (
    "id" TEXT NOT NULL,
    "managerUserId" TEXT NOT NULL,
    "managedUserId" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL DEFAULT 'PARENT_GUARDIAN',
    "permission" "RelationshipPermission" NOT NULL DEFAULT 'FULL_MANAGEMENT',
    "isEmergencyContact" BOOLEAN NOT NULL DEFAULT false,
    "emergencyPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRelationship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRelationship_managerUserId_managedUserId_key" ON "UserRelationship"("managerUserId", "managedUserId");
CREATE INDEX IF NOT EXISTS "UserRelationship_managerUserId_idx" ON "UserRelationship"("managerUserId");
CREATE INDEX IF NOT EXISTS "UserRelationship_managedUserId_idx" ON "UserRelationship"("managedUserId");

ALTER TABLE "UserRelationship" DROP CONSTRAINT IF EXISTS "UserRelationship_managerUserId_fkey";
ALTER TABLE "UserRelationship" ADD CONSTRAINT "UserRelationship_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRelationship" DROP CONSTRAINT IF EXISTS "UserRelationship_managedUserId_fkey";
ALTER TABLE "UserRelationship" ADD CONSTRAINT "UserRelationship_managedUserId_fkey" FOREIGN KEY ("managedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Alter TeamCategoryRegistration for tournament supervision delegation
ALTER TABLE "TeamCategoryRegistration" ADD COLUMN IF NOT EXISTS "onSiteResponsibleUserId" TEXT;
ALTER TABLE "TeamCategoryRegistration" ADD COLUMN IF NOT EXISTS "emergencyPhone" TEXT;

CREATE INDEX IF NOT EXISTS "TeamCategoryRegistration_onSiteResponsibleUserId_idx" ON "TeamCategoryRegistration"("onSiteResponsibleUserId");

ALTER TABLE "TeamCategoryRegistration" DROP CONSTRAINT IF EXISTS "TeamCategoryRegistration_onSiteResponsibleUserId_fkey";
ALTER TABLE "TeamCategoryRegistration" ADD CONSTRAINT "TeamCategoryRegistration_onSiteResponsibleUserId_fkey" FOREIGN KEY ("onSiteResponsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Create PushSubscription table
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

ALTER TABLE "PushSubscription" DROP CONSTRAINT IF EXISTS "PushSubscription_userId_fkey";
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
