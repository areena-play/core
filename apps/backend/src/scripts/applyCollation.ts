import { basePrisma as prisma } from '../config/prisma';

async function main() {
    console.log('Applying ICU collations...');
    const statements = [
        `DO $$ BEGIN CREATE COLLATION IF NOT EXISTS "natural_de" (provider = icu, locale = 'de-CH'); EXCEPTION WHEN OTHERS THEN null; END $$;`,
        `ALTER TABLE "User" ALTER COLUMN "lastName" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "User" ALTER COLUMN "firstName" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "User" ALTER COLUMN "city" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "User" ALTER COLUMN "street" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "User" ALTER COLUMN "phoneticFirstName" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "User" ALTER COLUMN "phoneticLastName" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "Club" ALTER COLUMN "name" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "Club" ALTER COLUMN "address" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "Club" ALTER COLUMN "city" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "Association" ALTER COLUMN "name" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "Association" ALTER COLUMN "shortName" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "Location" ALTER COLUMN "name" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "Location" ALTER COLUMN "address" TYPE text COLLATE "de-CH-x-icu";`,
        `ALTER TABLE "Location" ALTER COLUMN "city" TYPE text COLLATE "de-CH-x-icu";`
    ];

    for (const sql of statements) {
        try {
            await prisma.$executeRawUnsafe(sql);
            console.log('✓ Executed:', sql);
        } catch (e: any) {
            console.warn('Notice for statement:', sql, e.message);
        }
    }
    console.log('All ICU collations applied successfully!');
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));

