import '../config/env';
import { prisma } from '../config/prisma';
import { ClickTTScraperService } from '../services/clickttScraper.service';

async function main() {
    const args = process.argv.slice(2);
    const isFull = args.includes('--full') || args.includes('--init');
    const isResults = args.includes('--results');
    const isPlayers = args.includes('--players');
    const isElo = args.includes('--elo');
    const isExport = args.includes('--export');
    const isResetDb = args.includes('--reset-db') || args.includes('--load-full') || args.includes('--reset');
    const skipTournaments = args.includes('--skiptournaments') || args.includes('--skip-tournaments');
    const skipElo = args.includes('--skipelo') || args.includes('--skip-elo');

    console.log('🏓 Executing Click-TT Scraper CLI Tool...');

    let jobType: 'initial' | 'sync' | 'results' | 'players' | 'elo' | 'export' | 'reset-db' = 'sync';
    if (isResetDb) jobType = 'reset-db';
    else if (isFull) jobType = 'initial';
    else if (isResults) jobType = 'results';
    else if (isPlayers) jobType = 'players';
    else if (isElo) jobType = 'elo';
    else if (isExport) jobType = 'export';

    try {
        await ClickTTScraperService.runJob(jobType, {
            skipTournaments,
            skipElo,
        });
        console.log(`\n✅ Click-TT Scraper job '${jobType}' finished successfully.`);
    } catch (err: any) {
        console.error('\n❌ Fatal error running Click-TT task:', err);
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

