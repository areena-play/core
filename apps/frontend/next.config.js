const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { loadEnvConfig } = require('@next/env');

// Load monorepo root .env file if present
const rootEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
}
loadEnvConfig(path.resolve(__dirname, '../../'));

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    transpilePackages: ['@areena/shared'],
    env: {
        NEXT_PUBLIC_IS_DEMO: process.env.NEXT_PUBLIC_IS_DEMO || 'false',
        NEXT_PUBLIC_APP_VERSION: require('../../package.json').version,
        NEXT_PUBLIC_APP_BASE_URL: process.env.NEXT_PUBLIC_APP_BASE_URL || '',
        NEXT_PUBLIC_WS_PORT: process.env.NEXT_PUBLIC_WS_PORT || '',
    },
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                pathname: '/**',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/upload/file/:path*',
                destination: '/api/upload/file/:path*',
            },
        ];
    },
};

module.exports = nextConfig;
