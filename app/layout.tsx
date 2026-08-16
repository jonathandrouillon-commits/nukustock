import type {
  Metadata,
  Viewport,
} from 'next'

import { headers } from 'next/headers'

import './globals.css'

import AuthGate from '@/components/auth-gate'

function normalizeHost(host: string) {
  return host
    .toLowerCase()
    .split(',')[0]
    .trim()
    .split(':')[0]
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList =
    await headers()

  const host = normalizeHost(
    headersList.get(
      'x-forwarded-host'
    ) ||
      headersList.get('host') ||
      ''
  )

  const isRequisition =
    host ===
    'requisitionnuku.fenuaprobartender.com'

  const isBarNuku =
    host ===
    'barnuku.fenuaprobartender.com'

  if (isBarNuku) {
    return {
      title: 'Bar Nuku',
      applicationName: 'Bar Nuku',
      description:
        'Portail de l’équipe Bar de Nukutepipi',
      manifest:
        '/manifest-bar.webmanifest',
      icons: {
        icon: [
          {
            url: '/bar-nuku-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            url: '/bar-nuku-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        apple:
          '/bar-nuku-192.png',
      },
      appleWebApp: {
        capable: true,
        title: 'Bar Nuku',
        statusBarStyle:
          'black-translucent',
      },
    }
  }

  if (isRequisition) {
    return {
      title: 'Réquisitions Nuku',
      applicationName:
        'Réquisitions',
      description:
        'Réquisitions internes Nukutepipi',
      manifest:
        '/manifest-requisition.webmanifest',
      appleWebApp: {
        capable: true,
        title: 'Réquisitions',
        statusBarStyle: 'default',
      },
    }
  }

  return {
    title:
      'NukuStock Back Office',
    applicationName:
      'NukuStock Back Office',
    description:
      'Gestion des stocks et approvisionnements de Nukutepipi',
    manifest:
      '/manifest-nukustock.webmanifest',
    appleWebApp: {
      capable: true,
      title:
        'NukuStock Back Office',
      statusBarStyle: 'default',
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1220',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body>
        <AuthGate>
          {children}
        </AuthGate>
      </body>
    </html>
  )
}