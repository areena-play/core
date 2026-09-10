-- 1. Create Enums if they do not exist
DO $$ BEGIN
    CREATE TYPE "RatingTriggerReason" AS ENUM ('MONTHLY_SCHEDULE', 'BI_ANNUAL_LEVEL', 'MATCH_EVENT', 'INITIAL_PROVISIONAL', 'MANUAL_ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "LicenseScope" AS ENUM ('ALL', 'LEAGUE_ONLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ParticipantSide" AS ENUM ('HOME_1', 'HOME_2', 'AWAY_1', 'AWAY_2');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Alter User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentLevel" TEXT NOT NULL DEFAULT 'D1';

-- 3. Alter License table
ALTER TABLE "License" ADD COLUMN IF NOT EXISTS "tournamentId" TEXT;
ALTER TABLE "License" ADD COLUMN IF NOT EXISTS "isSecondaryClubLicense" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "License" ADD COLUMN IF NOT EXISTS "scope" "LicenseScope" NOT NULL DEFAULT 'ALL';

-- Create Foreign Key on License(tournamentId) -> Competition(id)
ALTER TABLE "License" DROP CONSTRAINT IF EXISTS "License_tournamentId_fkey";
ALTER TABLE "License" ADD CONSTRAINT "License_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Create RatingSnapshotHistory table
CREATE TABLE IF NOT EXISTS "RatingSnapshotHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "associationId" TEXT,
    "elo" DOUBLE PRECISION NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'D1',
    "rankOverall" INTEGER,
    "rankGender" INTEGER,
    "rankAgeCategory" INTEGER,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "triggerReason" "RatingTriggerReason" NOT NULL DEFAULT 'MONTHLY_SCHEDULE',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingSnapshotHistory_pkey" PRIMARY KEY ("id")
);

-- RatingSnapshotHistory Indexes
CREATE INDEX IF NOT EXISTS "RatingSnapshotHistory_userId_effectiveFrom_idx" ON "RatingSnapshotHistory"("userId", "effectiveFrom");
CREATE INDEX IF NOT EXISTS "RatingSnapshotHistory_associationId_effectiveFrom_idx" ON "RatingSnapshotHistory"("associationId", "effectiveFrom");

-- RatingSnapshotHistory Foreign Keys
ALTER TABLE "RatingSnapshotHistory" DROP CONSTRAINT IF EXISTS "RatingSnapshotHistory_userId_fkey";
ALTER TABLE "RatingSnapshotHistory" ADD CONSTRAINT "RatingSnapshotHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RatingSnapshotHistory" DROP CONSTRAINT IF EXISTS "RatingSnapshotHistory_associationId_fkey";
ALTER TABLE "RatingSnapshotHistory" ADD CONSTRAINT "RatingSnapshotHistory_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Create MatchParticipant table
CREATE TABLE IF NOT EXISTS "MatchParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "side" "ParticipantSide" NOT NULL DEFAULT 'HOME_1',
    "teamId" TEXT,
    "clubIdAtTime" TEXT,
    "licenseIdUsed" TEXT,
    "ratingSnapshotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- MatchParticipant Indexes
CREATE INDEX IF NOT EXISTS "MatchParticipant_matchId_idx" ON "MatchParticipant"("matchId");
CREATE INDEX IF NOT EXISTS "MatchParticipant_userId_idx" ON "MatchParticipant"("userId");
CREATE INDEX IF NOT EXISTS "MatchParticipant_ratingSnapshotId_idx" ON "MatchParticipant"("ratingSnapshotId");

-- MatchParticipant Foreign Keys
ALTER TABLE "MatchParticipant" DROP CONSTRAINT IF EXISTS "MatchParticipant_matchId_fkey";
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchParticipant" DROP CONSTRAINT IF EXISTS "MatchParticipant_userId_fkey";
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchParticipant" DROP CONSTRAINT IF EXISTS "MatchParticipant_teamId_fkey";
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MatchParticipant" DROP CONSTRAINT IF EXISTS "MatchParticipant_clubIdAtTime_fkey";
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_clubIdAtTime_fkey" FOREIGN KEY ("clubIdAtTime") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MatchParticipant" DROP CONSTRAINT IF EXISTS "MatchParticipant_licenseIdUsed_fkey";
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_licenseIdUsed_fkey" FOREIGN KEY ("licenseIdUsed") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MatchParticipant" DROP CONSTRAINT IF EXISTS "MatchParticipant_ratingSnapshotId_fkey";
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_ratingSnapshotId_fkey" FOREIGN KEY ("ratingSnapshotId") REFERENCES "RatingSnapshotHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

