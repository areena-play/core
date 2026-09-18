import { ClickTTDbIngestionService } from '../services/clickttDbIngestion.service';
import { prisma } from '../config/prisma';

async function runFullIngest() {
  console.log('🚀 Starting full reset and bulk load...');
  const start = Date.now();
  const res = await ClickTTDbIngestionService.resetAndLoadFullDatasets((p) => {
    console.log(`[Progress] [${p.phase}] ${p.message}`);
  });
  const durationSec = Math.round((Date.now() - start) / 1000);
  console.log(`\n🎉 DONE in ${durationSec}s! Result:`, res);

  const [matches, encounters, teams, categories, comps, users, clubs, seasons, participants, snapshots] = await Promise.all([
    prisma.match.count(),
    prisma.encounter.count(),
    prisma.team.count(),
    prisma.category.count(),
    prisma.competition.count(),
    prisma.user.count(),
    prisma.club.count(),
    prisma.season.count(),
    prisma.matchParticipant.count(),
    prisma.ratingSnapshotHistory.count(),
  ]);

  console.log('\n=== FINAL DB COUNTS ===');
  console.log('Seasons:', seasons);
  console.log('Clubs:', clubs);
  console.log('Users:', users);
  console.log('Rating Snapshots:', snapshots);
  console.log('Competitions:', comps);
  console.log('Categories:', categories);
  console.log('Teams:', teams);
  console.log('Encounters:', encounters);
  console.log('Matches:', matches);
  console.log('MatchParticipants:', participants);
  process.exit(0);
}

runFullIngest().catch((err) => {
  console.error('FAILED with error:', err);
  process.exit(1);
});

