/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    transpilePackages: ['@areena/shared'],
    env: {
        NEXT_PUBLIC_IS_DEMO: process.env.IS_DEMO || process.env.NEXT_PUBLIC_IS_DEMO || 'false',
        NEXT_PUBLIC_APP_VERSION: require('../../package.json').version || '0.0.0',
    },
    images: {
        domains: ['localhost'],
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
