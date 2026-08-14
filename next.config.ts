import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'requisitionnuku.fenuaprobartender.com',
          },
        ],
        destination: '/requisition',
        permanent: false,
      },
    ]
  },
}

export default nextConfig