'use client'

import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  usePathname,
  useRouter,
} from 'next/navigation'

import { supabase } from '@/lib/supabase'

const PUBLIC_ROUTES = [
  '/login',
  '/register',
]

export function AuthGate({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [checking, setChecking] =
    useState(true)

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false)

  const isPublicRoute =
    PUBLIC_ROUTES.includes(
      pathname
    )

  useEffect(() => {
    let active = true

    const checkSession =
      async () => {
        try {
          const {
            data,
            error,
          } =
            await supabase.auth.getSession()

          if (!active) {
            return
          }

          if (error) {
            console.error(
              'Erreur Supabase getSession :',
              error
            )

            setAuthenticated(
              false
            )

            if (
              !isPublicRoute
            ) {
              router.replace(
                '/login'
              )
            }

            return
          }

          const hasSession =
            Boolean(
              data.session
            )

          setAuthenticated(
            hasSession
          )

          if (
            !hasSession &&
            !isPublicRoute
          ) {
            router.replace(
              '/login'
            )
          }

          if (
            hasSession &&
            isPublicRoute
          ) {
            router.replace('/')
          }
        } catch (error) {
          console.error(
            'Erreur pendant la vérification de session :',
            error
          )

          if (!active) {
            return
          }

          setAuthenticated(
            false
          )

          if (
            !isPublicRoute
          ) {
            router.replace(
              '/login'
            )
          }
        } finally {
          if (active) {
            setChecking(
              false
            )
          }
        }
      }

    checkSession()

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session
        ) => {
          if (!active) {
            return
          }

          const hasSession =
            Boolean(session)

          setAuthenticated(
            hasSession
          )

          setChecking(false)

          if (
            !hasSession &&
            !PUBLIC_ROUTES.includes(
              pathname
            )
          ) {
            router.replace(
              '/login'
            )
            return
          }

          if (
            hasSession &&
            PUBLIC_ROUTES.includes(
              pathname
            )
          ) {
            router.replace('/')
          }
        }
      )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [
    pathname,
    router,
    isPublicRoute,
  ])

  if (checking) {
    return (
      <div
        style={{
          minHeight:
            '100vh',

          display:
            'grid',

          placeItems:
            'center',

          background:
            '#f4f6f9',

          color:
            '#667085',

          fontWeight:
            700,
        }}
      >
        Vérification de la
        session...
      </div>
    )
  }

  if (isPublicRoute) {
    return (
      <>
        {children}
      </>
    )
  }

  if (!authenticated) {
    return (
      <div
        style={{
          minHeight:
            '100vh',

          display:
            'grid',

          placeItems:
            'center',

          background:
            '#f4f6f9',

          color:
            '#667085',

          fontWeight:
            700,
        }}
      >
        Redirection vers la
        connexion...
      </div>
    )
  }

  return (
    <>
      {children}
    </>
  )
}