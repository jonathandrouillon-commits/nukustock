import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthGate } from '@/components/auth-gate'

export const metadata: Metadata = {
  title: 'NukuStock',
  description: 'Gestion des stocks et approvisionnements de Nukutepipi',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'NukuStock',
    statusBarStyle: 'default',
  },
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
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  )
}