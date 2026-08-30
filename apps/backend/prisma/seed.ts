import { prisma } from '../src/config/prisma';
import { seedDemoDatabase, clearDatabase } from '../src/services/seedDemo.service';

export { seedDemoDatabase, clearDatabase };

// Allow direct execution via CLI (e.g. `npm run prisma:seed`)
if (require.main === module) {
    seedDemoDatabase()
        .then(async () => {
            await prisma.$disconnect();
            process.exit(0);
        })
        .catch(async (e) => {
            console.error('❌ Error during demo seeding:', e);
            await prisma.$disconnect();
            process.exit(1);
        });
}
