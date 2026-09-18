import { stateManager } from '../stateManager';
import { storageManager } from '../storageManager';
import { scrapeSeasons } from '../scrapers/seasonsScraper';
import { scrapeClubs } from '../scrapers/clubsScraper';
import { scrapePlayersFromClubs } from '../scrapers/playersScraper';
import { scrapeLeaguesAndCups } from '../scrapers/leaguesScraper';
import { scrapeTournaments } from '../scrapers/tournamentsScraper';
import { fetchAvailableRankingDates, scrapeAllPlayersElo } from '../scrapers/eloScraper';
import { exportAllNormalizedDatasets, exportDeltaDatasets } from './exporter';

export async function runIncrementalSync(options: {
  onlyResults?: boolean;
  onlyPlayers?: boolean;
  onlyElo?: boolean;
  skipMatches?: boolean;
  skipPlayers?: boolean;
  skipElo?: boolean;
  skipTournaments?: boolean;
  noExport?: boolean;
  fullExport?: boolean;
  forceElo?: boolean;
  useApi?: boolean;
  concurrency?: number;
} = {}) {
  const startTime = Date.now();
  console.log('==================================================');
  console.log('⚡ Click-TT Scraper V2 - Incremental Delta Sync');
  console.log('==================================================\n');

  await stateManager.init();
  await storageManager.init();
  storageManager.startDeltaTracking();

  const syncAll = !options.onlyResults && !options.onlyPlayers && !options.onlyElo;
  const syncMatches = (syncAll || options.onlyResults) && !options.skipMatches;
  const syncPlayers = (syncAll || options.onlyPlayers) && !options.skipPlayers;
  const syncElo = (syncAll || options.onlyElo) && !options.skipElo;
  const syncTournaments = syncMatches && !options.skipTournaments;

  // 1. Seasons - check for all active seasons (if syncing match results)
  let activeNicknames: string[] = [];
  if (syncMatches) {
    console.log('▶️ [Step 1] Checking Seasons & Active Leagues');
    const seasons = await scrapeSeasons({ bypassCache: true });
    const activeSeasons = seasons.filter((s: any) => s.isActive || s.state === 'active');
    activeNicknames = activeSeasons.map((s: any) => s.seasonNickname);

    if (activeNicknames.length === 0 && seasons.length > 0) {
      const latest = seasons.find((s: any) => s.isLatest)?.seasonNickname || seasons[seasons.length - 1]?.seasonNickname;
      if (latest) activeNicknames.push(latest);
    }
  }

  // 2. Scan Clubs & Players for new registrations
  if (syncPlayers) {
    console.log('\n▶️ [Step 2] Checking for New Clubs & Players');
    await scrapeClubs({ bypassCache: true });
    await scrapePlayersFromClubs({ bypassCache: true, useApi: options.useApi });
  }

  // 3. Sync Encounters across all active seasons (Championship, Cup, Youth Challenge, Friendship League)
  if (syncMatches && activeNicknames.length > 0) {
    console.log(`\n▶️ [Step 3] Syncing Active Encounters across ${activeNicknames.length} active season(s): [${activeNicknames.join(', ')}]`);
    await scrapeLeaguesAndCups({ targetSeasonNicknames: activeNicknames, isIncremental: true });
  }

  // 4. Sync Recent Tournaments (30-day retrospective)
  if (syncTournaments) {
    console.log('\n▶️ [Step 4] Syncing Recent & Retrospective Tournaments');
    await scrapeTournaments({ isIncremental: true });
  }

  // 5. Check Elo Ranking Snapshot
  if (syncElo) {
    console.log('\n▶️ [Step 5] Checking Monthly Elo Ranking Snapshot');
    const dates = await fetchAvailableRankingDates();
    if (dates.length > 0) {
      const latestDate = dates[dates.length - 1];
      const lastScrapedDate = stateManager.meta.lastEloRankingDate;

      if (!lastScrapedDate || lastScrapedDate !== latestDate || options.forceElo) {
        console.log(`✨ New monthly Elo evaluation published ("${latestDate}"). Updating player timelines...`);
        await scrapeAllPlayersElo({ bypassCache: true, ...options });
      } else {
        console.log(`✅ Elo ratings are already current for ranking date "${latestDate}".`);
      }
    }
  }

  // 6. Refresh Datasets (Fast Delta Diff by default, Full Export on demand)
  if (!options.noExport) {
    if (options.fullExport) {
      await exportAllNormalizedDatasets();
    } else {
      await exportDeltaDatasets();
    }
  }

  await stateManager.saveMeta({ lastSyncAt: new Date().toISOString() });
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🏁 Incremental Delta Sync completed in ${elapsed}s!`);
}

