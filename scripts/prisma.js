const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Find and load .env file
const candidateEnvPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../apps/backend/.env'),
];

for (const envPath of candidateEnvPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
    }
}
dotenv.config();

const backendDir = path.resolve(__dirname, '../apps/backend');
const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const userArgs = process.argv.slice(2);
const isHelp = userArgs.some((arg) => arg === '--help' || arg === '-h');
const hasSchemaArg = userArgs.some((arg) => arg.startsWith('--schema'));

const args = [...userArgs];
if (!isHelp && !hasSchemaArg && userArgs.length > 0) {
    args.push('--schema=prisma/schema');
}

const result = spawnSync(npxCmd, ['prisma', ...args], {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
    shell: true,
});

process.exit(result.status !== null ? result.status : (result.error ? 1 : 0));

