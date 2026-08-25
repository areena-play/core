/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@areena/shared'],
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig

