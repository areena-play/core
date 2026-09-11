import path from 'path';
import '../config/env';
import { prisma } from '../config/prisma';
import { ClickTTImportService } from '../services/clickttImport.service';

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run') || args.includes('-d');
    const pathArg = args.find((a) => a.startsWith('--data-path='));
    const customPath = pathArg ? pathArg.split('=')[1] : undefined;

    console.log('🏁 Executing ClickTT Import CLI Tool...');
    if (dryRun) {
        console.log('🧪 DRY RUN MODE ENABLED - No changes will be written to the database.');
    }

    try {
        const result = await ClickTTImportService.importClickTTData({
            dataPath: customPath,
            dryRun,
        });

        console.log('\n📊 Summary Result:');
        console.log(JSON.stringify(result, null, 2));

        if (!result.success) {
            console.warn(`\n⚠️ Finished with ${result.errors.length} warnings/errors.`);
        }
    } catch (err: any) {
        console.error('\n❌ Fatal error running ClickTT import:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((e) => {
            console.error(e);
            process.exit(1);
        });
}

