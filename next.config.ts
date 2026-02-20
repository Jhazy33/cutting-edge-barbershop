import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    const host = process.env.VERCEL_URL || 'localhost:3000'

    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'voice.cihconsultingllc.com',
          },
        ],
        destination: '/voice',
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'voice-ce.cihconsultingllc.com',
          },
        ],
        destination: '/voice',
      },
    ]
  },
}

export default nextConfig
