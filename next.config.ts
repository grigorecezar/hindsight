import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Node-only libraries loaded at runtime instead of bundled.
  serverExternalPackages: ['pino', 'pino-pretty', 'yahoo-finance2'],
  turbopack: {
    // A stray package-lock.json in the home directory confuses workspace
    // detection.
    root: __dirname,
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
