import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      // ==========================================
      // APPLICATION RÉQUISITION
      // requisitionnuku.fenuaprobartender.com
      // ==========================================
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

      // ==========================================
      // APPLICATION BAR NUKU
      // barnuku.fenuaprobartender.com
      // ==========================================
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'barnuku.fenuaprobartender.com',
          },
        ],
        destination: '/bar',
        permanent: false,
      },
    ]
  },
}

export default nextConfig