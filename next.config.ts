import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  // Allow cross-origin images (product images from external URLs)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Suppress Mongoose 'strictQuery' warnings in dev
  serverExternalPackages: ['mongoose'],
};

export default nextConfig;
