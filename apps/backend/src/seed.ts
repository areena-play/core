import { prisma } from './config/prisma';
import { seedDemoDatabase, clearDatabase } from './services/seedDemo.service';

export { seedDemoDatabase, clearDatabase };

async function runSeed() {
    const isForce = process.argv.includes('--force') || process.env.FORCE_SEED === 'true';
    const isDemo = process.env.IS_DEMO === 'true';
    const isDev = process.env.NODE_ENV !== 'production';

    const userCount = await prisma.user.count();

    // 1. Guard against overwriting existing data
    if (userCount > 0 && !isForce) {
        console.log(`[Seed] Database already contains data (${userCount} users found). Skipping automatic seed.`);
        return;
    }

    // 2. In production without IS_DEMO enabled, do not seed mock data
    if (!isDev && !isDemo && !isForce) {
        console.log('[Seed] Production environment without IS_DEMO=true detected. Skipping demo seeding.');
        return;
    }

    console.log(isForce ? '🔄 Force seed requested. Re-seeding database...' : '🌱 Seeding initial demo data...');
    await seedDemoDatabase();
}

if (require.main === module) {
    runSeed()
        .then(async () => {
            await prisma.$disconnect();
            process.exit(0);
        })
        .catch(async (e) => {
            console.error('❌ Error during database seeding:', e);
            await prisma.$disconnect();
            process.exit(1);
        });
}

