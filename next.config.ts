import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      // Application Réquisition
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

      // Bar Nuku
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'barnuku.fenuaprobartender.com',
          },
        ],
        destination: '/requests',
        permanent: false,
      },
    ]
  },
}

export default nextConfig