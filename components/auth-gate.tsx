'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/app-shell'

const PUBLIC_ROUTES = ['/login', '/register']

export function AuthGate({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  useEffect(() => {
    let active = true

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!active) return

      const hasSession = Boolean(session)
      setAuthenticated(hasSession)

      if (!hasSession && !isPublicRoute) {
        router.replace('/login')
      }

      if (hasSession && isPublicRoute) {
        router.replace('/')
      }

      setChecking(false)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return

      const hasSession = Boolean(session)
      setAuthenticated(hasSession)

      if (!hasSession && !PUBLIC_ROUTES.includes(pathname)) {
        router.replace('/login')
      }

      if (hasSession && PUBLIC_ROUTES.includes(pathname)) {
        router.replace('/')
      }

      setChecking(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [pathname, router, isPublicRoute])

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f4f6f9',
          color: '#667085',
          fontWeight: 700,
        }}
      >
        Vérification de la session...
      </div>
    )
  }

  if (isPublicRoute) {
    return <>{children}</>
  }

  if (!authenticated) {
    return null
  }

  return <AppShell>{children}</AppShell>
}