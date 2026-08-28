/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    transpilePackages: ['@areena/shared'],
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
