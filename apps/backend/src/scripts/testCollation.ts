import { basePrisma as prisma } from '../config/prisma';

async function main() {
    const dbInfo: any = await prisma.$queryRawUnsafe(`
        SELECT datname, datcollate, datctype 
        FROM pg_database 
        WHERE datname = current_database()
    `);
    console.log('Database collation info:', dbInfo);

    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "lastName" TYPE text COLLATE "de-CH-x-icu";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "firstName" TYPE text COLLATE "de-CH-x-icu";`);
    console.log('Altered User columns to de-CH-x-icu.');

    const positionOfOhri = await prisma.$queryRawUnsafe(`
        WITH ordered AS (
            SELECT "firstName", "lastName", ROW_NUMBER() OVER (ORDER BY "lastName" ASC, "firstName" ASC) as rn
            FROM "User"
        )
        SELECT * FROM ordered 
        WHERE rn BETWEEN 
            (SELECT rn - 3 FROM ordered WHERE "lastName" = 'Öhri' LIMIT 1) 
            AND 
            (SELECT rn + 3 FROM ordered WHERE "lastName" = 'Öhri' LIMIT 1);
    `);
    console.log('Records surrounding Öhri in full table:', positionOfOhri);
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));
