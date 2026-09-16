-- 1. Ensure custom natural collation or use built-in ICU collation
DO $$ BEGIN
    CREATE COLLATION IF NOT EXISTS "natural_de" (provider = icu, locale = 'de-CH');
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- 2. Apply natural German/Swiss-German collation to User columns
DO $$ BEGIN
    ALTER TABLE "User" ALTER COLUMN "lastName" TYPE text COLLATE "de-CH-x-icu";
    ALTER TABLE "User" ALTER COLUMN "firstName" TYPE text COLLATE "de-CH-x-icu";
    ALTER TABLE "User" ALTER COLUMN "city" TYPE text COLLATE "de-CH-x-icu";
    ALTER TABLE "User" ALTER COLUMN "street" TYPE text COLLATE "de-CH-x-icu";
    ALTER TABLE "User" ALTER COLUMN "phoneticFirstName" TYPE text COLLATE "de-CH-x-icu";
    ALTER TABLE "User" ALTER COLUMN "phoneticLastName" TYPE text COLLATE "de-CH-x-icu";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- 3. Apply natural collation to Club columns
DO $$ BEGIN
    ALTER TABLE "Club" ALTER COLUMN "name" TYPE text COLLATE "de-CH-x-icu";
    ALTER TABLE "Club" ALTER COLUMN "address" TYPE text COLLATE "de-CH-x-icu";
    ALTER TABLE "Club" ALTER COLUMN "city" TYPE text COLLATE "de-CH-x-icu";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- 4. Apply natural collation to Association columns
DO $$ BEGIN
    ALTER TABLE "Association" ALTER COLUMN "name" TYPE text COLLATE "de-CH-x-icu";
    ALTER TABLE "Association" ALTER COLUMN "shortName" TYPE text COLLATE "de-CH-x-icu";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- 5. Apply natural collation to Location columns
DO $$ BEGIN
    ALTER TABLE "Location" ALTER COLUMN "name" TYPE text COLLATE "de-CH-x-icu";
    ALTER TABLE "Location" ALTER COLUMN "address" TYPE text COLLATE "de-CH-x-icu";
    ALTER TABLE "Location" ALTER COLUMN "city" TYPE text COLLATE "de-CH-x-icu";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

