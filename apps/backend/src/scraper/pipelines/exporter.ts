import { storageManager } from '../storageManager';
import { stateManager } from '../stateManager';

export async function exportAllNormalizedDatasets() {
  console.log('\n==================================================');
  console.log('📦 Compiling & Exporting Normalized V2 Datasets');
  console.log('==================================================');

  await storageManager.init();

  const entities = [
    { name: 'players', key: 'licenceNr' },
    { name: 'player_histories', key: 'licenceNr' },
    { name: 'clubs', key: 'clubNr' },
    { name: 'seasons', key: 'seasonNickname' },
    { name: 'competitions', key: 'competitionId' },
    { name: 'categories', key: 'categoryId' },
    { name: 'groups', key: 'groupId' },
    { name: 'encounters', key: 'encounterId' },
    { name: 'matches', key: 'matchId' }
  ];

  const exportSummary: Record<string, number> = {};

  for (const ent of entities) {
    process.stdout.write(`   ↳ Exporting ${ent.name}.json... `);
    await storageManager.compactEntity(ent.name, ent.key);
    const count = await storageManager.exportToJson(ent.name);
    exportSummary[ent.name] = count;
    console.log(`✅ (${count} records)`);
  }

  await stateManager.saveMeta({ counts: exportSummary, lastExportAt: new Date().toISOString() });
  console.log('\n🎉 All 9 datasets successfully compiled in storage/clicktt_storage/data/ directory!');
  return exportSummary;
}

export async function exportDeltaDatasets() {
  await storageManager.init();
  const res = await storageManager.exportDeltaToJson();

  const nonZeroCounts = Object.entries(res.counts)
    .filter(([_, c]) => c > 0)
    .map(([k, c]) => `${c} ${k}`)
    .join(', ');

  if (res.totalRecords > 0) {
    console.log(`\n⚡ [Delta Export] Diff saved: ${res.fileName} (${res.fileSizeKb} KB) -> [${nonZeroCounts}]`);
  } else {
    console.log(`\n⚡ [Delta Export] Diff saved: ${res.fileName} (0 new records in this sync session)`);
  }

  return res;
}

