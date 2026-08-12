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
import AppShell from '@/components/app-shell'

const PUBLIC_ROUTES = [
  '/login',
  '/register',
]

type AuthGateProps = {
  children: ReactNode
}

type Profile = {
  id: string
  role: string
  active: boolean
}

function isRequisitionHost() {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.location.hostname ===
    'requisitionnuku.fenuaprobartender.com'
  )
}

export default function AuthGate({
  children,
}: AuthGateProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [checking, setChecking] =
    useState(true)

  const [authenticated, setAuthenticated] =
    useState(false)

  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [requisitionHost, setRequisitionHost] =
    useState(false)

  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname)

  useEffect(() => {
    let active = true

    const requisitionDomain =
      isRequisitionHost()

    setRequisitionHost(
      requisitionDomain
    )

    const resolveSession =
      async () => {
        setChecking(true)

        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession()

        if (!active) {
          return
        }

        if (!session?.user) {
          setAuthenticated(false)
          setProfile(null)
          setChecking(false)

          if (!isPublicRoute) {
            router.replace(
              '/login'
            )
          }

          return
        }

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select(
            'id, role, active'
          )
          .eq(
            'id',
            session.user.id
          )
          .maybeSingle()

        if (!active) {
          return
        }

        if (
          profileError ||
          !profileData ||
          profileData.active === false
        ) {
          setAuthenticated(false)
          setProfile(null)
          setChecking(false)

          await supabase.auth.signOut({
            scope: 'local',
          })

          router.replace(
            '/login'
          )

          return
        }

        const nextProfile =
          profileData as Profile

        setAuthenticated(true)
        setProfile(nextProfile)

        /*
         * PORTAIL REQUISITION NUKU
         * Aucun menu back-office.
         */
        if (requisitionDomain) {
          const allowed =
            nextProfile.role ===
              'requisitionnaire' ||
            nextProfile.role ===
              'admin'

          if (!allowed) {
            await supabase.auth.signOut({
              scope: 'local',
            })

            setAuthenticated(false)
            setProfile(null)
            setChecking(false)

            router.replace(
              '/login'
            )

            return
          }

          if (isPublicRoute) {
            router.replace(
              '/requisition'
            )
          } else if (
            pathname !==
              '/requisition' &&
            !pathname.startsWith(
              '/requisition/'
            )
          ) {
            router.replace(
              '/requisition'
            )
          }

          setChecking(false)
          return
        }

        /*
         * BACK-OFFICE NUKUSTOCK
         * Les requisitionnaires n'y ont pas accès.
         */
        if (
          nextProfile.role ===
          'requisitionnaire'
        ) {
          window.location.replace(
            'https://requisitionnuku.fenuaprobartender.com/requisition'
          )
          return
        }

        if (isPublicRoute) {
          router.replace('/')
        }

        setChecking(false)
      }

    void resolveSession()

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!active) {
            return
          }

          if (!session) {
            setAuthenticated(false)
            setProfile(null)

            if (!isPublicRoute) {
              router.replace(
                '/login'
              )
            }
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
          minHeight: '100vh',
          display: 'grid',
          placeItems:
            'center',
          background:
            '#f4f6f9',
          color: '#667085',
          fontWeight: 700,
        }}
      >
        Vérification de la session...
      </div>
    )
  }

  /*
   * LOGIN / REGISTER
   * Aucun AppShell autour.
   */
  if (isPublicRoute) {
    return <>{children}</>
  }

  if (
    !authenticated ||
    !profile
  ) {
    return null
  }

  /*
   * PORTAIL REQUISITION
   * Interface dédiée sans menu NukuStock.
   */
  if (requisitionHost) {
    return <>{children}</>
  }

  /*
   * BACK-OFFICE NUKUSTOCK
   * AppShell remet toute la barre de menu.
   */
  return (
    <AppShell>
      {children}
    </AppShell>
  )
}