import { stateManager } from '../stateManager';
import { storageManager } from '../storageManager';
import { scrapeSeasons } from '../scrapers/seasonsScraper';
import { scrapeClubs } from '../scrapers/clubsScraper';
import { scrapePlayersFromClubs, scrapePlayerDetails } from '../scrapers/playersScraper';
import { scrapeLeaguesAndCups } from '../scrapers/leaguesScraper';
import { scrapeTournaments } from '../scrapers/tournamentsScraper';
import { scrapeAllPlayersElo } from '../scrapers/eloScraper';
import { exportAllNormalizedDatasets } from './exporter';

export async function runInitialScrape(options: {
  skipTournaments?: boolean;
  skipElo?: boolean;
  useApi?: boolean;
  limit?: number;
  concurrency?: number;
} = {}) {
  const startTime = Date.now();
  console.log('==================================================');
  console.log('🚀 Click-TT Scraper V2 - Full Initial Scrape');
  console.log('==================================================\n');

  await stateManager.init();
  await storageManager.init();

  // 1. Seasons
  console.log('▶️ [Step 1/7] Seasons Discovery');
  await scrapeSeasons();

  // 2. Clubs (filtering out T-Card)
  console.log('\n▶️ [Step 2/7] Clubs Extraction');
  await scrapeClubs();

  // 3. Players Roster Extraction
  console.log('\n▶️ [Step 3/7] Players Extraction');
  await scrapePlayersFromClubs({ useApi: options.useApi });

  // 4. Player Details & Birthdays
  console.log('\n▶️ [Step 4/7] Player Birthdays & Profiles Enrichment');
  await scrapePlayerDetails();

  // 5. Leagues & Cups (Championships, Categories, Groups, Encounters, Matches)
  console.log('\n▶️ [Step 5/7] Leagues & Cups Scraping');
  await scrapeLeaguesAndCups({ isIncremental: false });

  // 6. Tournaments Scraping (HTML Calendar & Match Brackets)
  if (options.skipTournaments) {
    console.log('\n⏭️ [Step 6/7] Tournaments Scraping (Skipped)');
  } else {
    console.log('\n▶️ [Step 6/7] Tournaments Scraping');
    await scrapeTournaments({ isIncremental: false });
  }

  // 7. Player Elo Histories (Rapid Single-Page Extraction)
  if (options.skipElo) {
    console.log('\n⏭️ [Step 7/7] Player Elo Histories Extraction (Skipped)');
  } else {
    console.log('\n▶️ [Step 7/7] Player Elo Histories Extraction');
    await scrapeAllPlayersElo(options);
  }

  // 8. Final Export
  await exportAllNormalizedDatasets();

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🏁 Full Initial Scrape completed successfully in ${elapsed}s!`);
}

