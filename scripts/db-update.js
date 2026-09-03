const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Walk up to find .env file
const candidateEnvPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../apps/backend/.env'),
];

let loadedEnv = false;
for (const envPath of candidateEnvPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        loadedEnv = true;
        break;
    }
}
dotenv.config();

// Default fallback for local development if not defined
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://areena_admin:supersecretpassword@localhost:5432/areena_db?schema=public';
}

const backendDir = path.resolve(__dirname, '../apps/backend');
const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

console.log('🔄 [AREENA] Synchronizing Prisma schema with local database (db push)...');

const pushRes = spawnSync(npxCmd, ['prisma', 'db', 'push', '--schema=prisma/schema'], {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
    shell: true,
});

if (pushRes.status !== 0) {
    console.error('❌ Failed to push schema to database.');
    process.exit(pushRes.status || 1);
}

console.log('⚡ [AREENA] Regenerating Prisma client...');

const genRes = spawnSync(npxCmd, ['prisma', 'generate', '--schema=prisma/schema'], {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
    shell: true,
});

if (genRes.status !== 0) {
    console.error('❌ Failed to generate Prisma client.');
    process.exit(genRes.status || 1);
}

console.log('✅ [AREENA] Database schema and Prisma client updated successfully!');