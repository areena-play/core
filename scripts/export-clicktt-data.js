#!/usr/bin/env node

/**
 * Click-TT Scraped Data Export Utility
 * Packs the local ClickTT storage directory into a compressed .tar.gz archive.
 * 
 * Usage:
 *   node scripts/export-clicktt-data.js [output_file.tar.gz]
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const storageDir = process.env.CLICKTT_STORAGE_DIR || path.resolve(__dirname, '../apps/backend/storage/clicktt_storage');
const fallbackStorageDir = path.resolve(__dirname, '../storage/clicktt_storage');

const targetStorageDir = fs.existsSync(storageDir)
    ? storageDir
    : fs.existsSync(fallbackStorageDir)
    ? fallbackStorageDir
    : storageDir;

if (!fs.existsSync(targetStorageDir)) {
    console.error(`❌ ClickTT storage directory not found at: ${targetStorageDir}`);
    console.error('Please run the scraper locally first or specify CLICKTT_STORAGE_DIR.');
    process.exit(1);
}

const defaultFilename = `clicktt_scraped_data_${new Date().toISOString().slice(0, 10)}.tar.gz`;
const outputPath = path.resolve(process.argv[2] || defaultFilename);

console.log('====================================================');
console.log('📦 Click-TT Local Storage Export');
console.log('====================================================');
console.log(`Source Storage Directory: ${targetStorageDir}`);
console.log(`Target Archive:          ${outputPath}`);

// Check tar availability
const tarCheck = spawnSync('tar', ['--version'], { stdio: 'ignore' });
if (tarCheck.status !== 0) {
    console.error('❌ "tar" executable is required but not found in PATH.');
    process.exit(1);
}

console.log('\nCompressing storage directory...');
const tarRes = spawnSync('tar', ['-czf', outputPath, '-C', targetStorageDir, '.'], {
    stdio: 'inherit',
});

if (tarRes.status === 0 && fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log('\n====================================================');
    console.log('✅ Export successfully completed!');
    console.log(`Archive file: ${outputPath}`);
    console.log(`Archive size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log('====================================================');
    console.log('\nTo upload this archive to dev/prod, run:');
    console.log(`node scripts/upload-clicktt-data.js --url https://dev.areena.ch --token <SUPER_ADMIN_TOKEN> --file ${outputPath} --ingest\n`);
} else {
    console.error('\n❌ Failed to create tar archive.');
    process.exit(1);
}
