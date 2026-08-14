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
  const headersList = await headers()

  const host = normalizeHost(
    headersList.get('x-forwarded-host') ||
    headersList.get('host') ||
    ''
  )

  const isRequisition =
    host ===
    'requisitionnuku.fenuaprobartender.com'

  return {
    title: isRequisition
      ? 'Réquisitions Nuku'
      : 'NukuStock Back Office',

    applicationName: isRequisition
      ? 'Réquisitions'
      : 'NukuStock Back Office',

    description: isRequisition
      ? 'Réquisitions internes Nukutepipi'
      : 'Gestion des stocks et approvisionnements de Nukutepipi',

    manifest: isRequisition
      ? '/manifest-requisition.webmanifest'
      : '/manifest-nukustock.webmanifest',

    appleWebApp: {
      capable: true,
      title: isRequisition
        ? 'Réquisitions'
        : 'NukuStock Back Office',
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