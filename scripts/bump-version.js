const fs = require('fs');
const path = require('path');

const bumpType = process.argv[2]; // 'patch', 'minor', 'major'

if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error('Usage: node bump-version.js [patch|minor|major]');
    process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const rootPkgPath = path.join(rootDir, 'package.json');

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const currentVersion = rootPkg.version || '1.0.0';
const [major, minor, patch] = currentVersion.split('.').map(Number);

let newVersion;
if (bumpType === 'major') {
    newVersion = `${major + 1}.0.0`;
} else if (bumpType === 'minor') {
    newVersion = `${major}.${minor + 1}.0`;
} else {
    newVersion = `${major}.${minor}.${patch + 1}`;
}

// 1. Update root package.json
rootPkg.version = newVersion;
fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 4) + '\n', 'utf8');
console.log(`Bumped root package.json: ${currentVersion} -> ${newVersion}`);

// 2. Sync all workspaces
require('./sync-versions.js');

