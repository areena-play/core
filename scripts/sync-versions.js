const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const rootPkgPath = path.join(rootDir, 'package.json');

if (!fs.existsSync(rootPkgPath)) {
    console.error('Error: root package.json not found at', rootPkgPath);
    process.exit(1);
}

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const targetVersion = rootPkg.version;

const workspacePackages = [
    'apps/frontend/package.json',
    'apps/backend/package.json',
    'apps/websocket-server/package.json',
    'packages/shared/package.json',
];

let updatedCount = 0;

workspacePackages.forEach((relPath) => {
    const fullPath = path.join(rootDir, relPath);
    if (fs.existsSync(fullPath)) {
        try {
            const raw = fs.readFileSync(fullPath, 'utf8');
            const pkg = JSON.parse(raw);
            if (pkg.version !== targetVersion) {
                pkg.version = targetVersion;
                fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 4) + '\n', 'utf8');
                console.log(`✓ Updated ${relPath} -> ${targetVersion}`);
                updatedCount++;
            } else {
                console.log(`- ${relPath} already at ${targetVersion}`);
            }
        } catch (err) {
            console.error(`Failed to update ${relPath}:`, err.message);
        }
    }
});

console.log(`Sync complete. Monorepo version is now ${targetVersion} (updated ${updatedCount} packages).`);

