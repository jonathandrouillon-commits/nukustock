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
import { AppShell } from '@/components/app-shell'

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

function isBarNukuHost() {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.location.hostname ===
    'barnuku.fenuaprobartender.com'
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

  const [barNukuHost, setBarNukuHost] =
    useState(false)

  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname)

  useEffect(() => {
    let active = true

    const requisitionDomain =
      isRequisitionHost()

    const barNukuDomain =
      isBarNukuHost()

    setRequisitionHost(
      requisitionDomain
    )

    setBarNukuHost(
      barNukuDomain
    )

    const resolveUser = async () => {
      setChecking(true)

      const {
        data: {
          session,
        },
        error: sessionError,
      } =
        await supabase.auth.getSession()

      if (!active) {
        return
      }

      if (
        sessionError ||
        !session?.user
      ) {
        setAuthenticated(false)
        setProfile(null)
        setChecking(false)

        if (!isPublicRoute) {
          router.replace('/login')
        }

        return
      }

      // BARNUKU :
      // Les comptes équipe sont identifiés par app_metadata.
      // Ils n'ont pas besoin d'une ligne dans public.profiles.
      if (barNukuDomain) {
        const employeeId =
          String(
            session.user.app_metadata
              ?.employee_id || ''
          ).trim()

        const barRole =
          String(
            session.user.app_metadata
              ?.bar_role || ''
          ).trim()

        const allowedRoles = [
          'manager_admin',
          'assistant_manager',
          'staff',
        ]

        if (
          !employeeId ||
          !allowedRoles.includes(
            barRole
          )
        ) {
          setAuthenticated(false)
          setProfile(null)
          setChecking(false)

          await supabase.auth.signOut({
            scope: 'local',
          })

          router.replace('/login')
          return
        }

        setAuthenticated(true)

        // Profil synthétique uniquement pour satisfaire
        // le rendu AuthGate côté BarNuku.
        setProfile({
          id: session.user.id,
          role: barRole,
          active: true,
        })

        if (isPublicRoute) {
          router.replace('/bar')
        }

        setChecking(false)
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

        router.replace('/login')
        return
      }

      const nextProfile =
        profileData as Profile

      setAuthenticated(true)
      setProfile(nextProfile)

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
          router.replace('/login')
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

    void resolveUser()

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!active) {
            return
          }

          /*
           * Ne jamais déconnecter l'utilisateur sur un événement
           * transitoire de rafraîchissement de session.
           * Le retour au login n'est déclenché que par une vraie
           * déconnexion explicite.
           */
          if (
            event === 'SIGNED_OUT'
          ) {
            setAuthenticated(false)
            setProfile(null)

            if (!isPublicRoute) {
              router.replace(
                '/login'
              )
            }

            return
          }

          if (
            session?.user &&
            (
              event === 'SIGNED_IN' ||
              event === 'TOKEN_REFRESHED' ||
              event === 'USER_UPDATED'
            )
          ) {
            setAuthenticated(true)
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

  if (
    !authenticated ||
    !profile
  ) {
    return null
  }

  if (requisitionHost) {
    return <>{children}</>
  }

  // BarNuku conserve AppShell :
  // menu BAR TEAM + barre utilisateur + déconnexion.
  return (
    <AppShell>
      {children}
    </AppShell>
  )
}