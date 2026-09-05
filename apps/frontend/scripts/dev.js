const path = require('path');
const { spawn } = require('child_process');
const { loadEnvConfig } = require('@next/env');

// Load environment from monorepo root and frontend directory
loadEnvConfig(path.resolve(__dirname, '../../../'));
loadEnvConfig(path.resolve(__dirname, '../'));

const port = process.env.FRONTEND_PORT || process.env.PORT || 3000;
const isProd = process.argv.includes('start');

console.log(`[AREENA Frontend] Starting on port ${port}...`);

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(
    npxCmd,
    ['next', isProd ? 'start' : 'dev', '-p', String(port)],
    {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            PORT: String(port),
            FRONTEND_PORT: String(port),
        },
    }
);

child.on('exit', (code) => {
    process.exit(code || 0);
});

child.on('error', (err) => {
    console.error('[AREENA Frontend] Failed to start Next.js process:', err);
    process.exit(1);
});

