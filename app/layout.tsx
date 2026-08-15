import type { Metadata, Viewport } from 'next'
import './globals.css'

import { AppShell } from '@/components/app-shell'
import { PwaRegister } from '@/components/pwa-register'

export const metadata: Metadata = {
  title: {
    default: 'NukuStock',
    template: '%s | NukuStock',
  },
  description: 'Gestion des stocks Nukutepipi',

  manifest: '/manifest.webmanifest',

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
    apple: [
      {
        url: '/bar-nuku-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  },

  appleWebApp: {
    capable: true,
    title: 'Bar Nuku',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#7c3aed',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body>
        <PwaRegister />

        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  )
}