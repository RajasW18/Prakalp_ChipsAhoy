/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  env: {
    NEXT_PUBLIC_API_URL:  process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL:   process.env.NEXT_PUBLIC_WS_URL   || 'ws://localhost:3001/ws',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },  // Google avatars
    ],
  },
};

module.exports = nextConfig;
