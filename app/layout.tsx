import type {
  Metadata,
  Viewport,
} from 'next'

import { headers } from 'next/headers'

import './globals.css'

import AuthGate from '@/components/auth-gate'

function isRequisitionHost(host: string) {
  return host
    .toLowerCase()
    .split(':')[0] ===
    'requisitionnuku.fenuaprobartender.com'
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const host =
    headersList.get('host') || ''

  const requisitionMode =
    isRequisitionHost(host)

  return {
    title: requisitionMode
      ? 'Réquisitions Nuku'
      : 'NukuStock',

    description: requisitionMode
      ? 'Réquisitions internes Nukutepipi'
      : 'Gestion des stocks et approvisionnements de Nukutepipi',

    manifest: requisitionMode
      ? '/manifest.webmanifest'
      : '/manifest-nukustock.webmanifest',

    appleWebApp: {
      capable: true,
      title: requisitionMode
        ? 'Réquisitions'
        : 'NukuStock',
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