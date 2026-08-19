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

import type {
  Session,
} from '@supabase/supabase-js'

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

function currentHost() {
  if (
    typeof window ===
    'undefined'
  ) {
    return ''
  }

  return window.location.hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .trim()
}

function isRequisitionHost() {
  return (
    currentHost() ===
    'requisitionnuku.fenuaprobartender.com'
  )
}

function isBarNukuHost() {
  return (
    currentHost() ===
    'barnuku.fenuaprobartender.com'
  )
}

export default function AuthGate({
  children,
}: AuthGateProps) {
  const pathname =
    usePathname()

  const router =
    useRouter()

  const [
    checking,
    setChecking,
  ] = useState(true)

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false)

  const [
    profile,
    setProfile,
  ] =
    useState<Profile | null>(
      null
    )

  const [
    requisitionHost,
    setRequisitionHost,
  ] = useState(false)

  const [
    barNukuHost,
    setBarNukuHost,
  ] = useState(false)

  useEffect(() => {
    let active = true

    const requisitionDomain =
      isRequisitionHost()

    const barDomain =
      isBarNukuHost()

    setRequisitionHost(
      requisitionDomain
    )

    setBarNukuHost(
      barDomain
    )

    const applySession =
      async (
        session:
          Session | null
      ) => {
        if (!active) {
          return
        }

        if (
          !session?.user
        ) {
          setAuthenticated(
            false
          )

          setProfile(null)

          return
        }

        /*
         * BAR NUKU
         */
        if (barDomain) {
          const employeeId =
            String(
              session.user
                .app_metadata
                ?.employee_id ||
                ''
            ).trim()

          const barRole =
            String(
              session.user
                .app_metadata
                ?.bar_role ||
                ''
            ).trim()

          const allowedRoles =
            [
              'manager_admin',
              'assistant_manager',
              'staff',
            ]

          console.log(
            'BARNUKU AUTH',
            {
              email:
                session.user
                  .email,
              employeeId,
              barRole,
              host:
                currentHost(),
            }
          )

          if (
            !employeeId ||
            !allowedRoles.includes(
              barRole
            )
          ) {
            console.error(
              'Compte BarNuku non autorisé',
              {
                email:
                  session.user
                    .email,
                employeeId,
                barRole,
              }
            )

            setAuthenticated(
              false
            )

            setProfile(null)

            return
          }

          setAuthenticated(
            true
          )

          setProfile({
            id:
              session.user.id,
            role:
              barRole,
            active:
              true,
          })

          return
        }

        /*
         * NUKUSTOCK / REQUISITION
         */
        const {
          data:
            profileData,
          error:
            profileError,
        } =
          await supabase
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
          profileData.active ===
            false
        ) {
          console.error(
            'Profil invalide',
            profileError
          )

          setAuthenticated(
            false
          )

          setProfile(null)

          return
        }

        const nextProfile =
          profileData as Profile

        if (
          requisitionDomain
        ) {
          const allowed =
            nextProfile.role ===
              'requisitionnaire' ||
            nextProfile.role ===
              'admin'

          if (!allowed) {
            setAuthenticated(
              false
            )

            setProfile(null)

            return
          }
        }

        setAuthenticated(
          true
        )

        setProfile(
          nextProfile
        )
      }

    const initialize =
      async () => {
        setChecking(true)

        try {
          const {
            data,
            error,
          } =
            await supabase.auth
              .getSession()

          if (!active) {
            return
          }

          if (error) {
            console.error(
              'Erreur getSession',
              error
            )

            setAuthenticated(
              false
            )

            setProfile(null)

            return
          }

          await applySession(
            data.session
          )
        } catch (
          caughtError
        ) {
          console.error(
            'Erreur AuthGate',
            caughtError
          )

          if (active) {
            setAuthenticated(
              false
            )

            setProfile(null)
          }
        } finally {
          if (active) {
            setChecking(
              false
            )
          }
        }
      }

    void initialize()

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (
            event,
            session
          ) => {
            if (!active) {
              return
            }

            console.log(
              'Supabase Auth Event:',
              event
            )

            if (
              event ===
              'SIGNED_OUT'
            ) {
              setAuthenticated(
                false
              )

              setProfile(null)

              return
            }

            if (
              event ===
                'SIGNED_IN' ||
              event ===
                'TOKEN_REFRESHED' ||
              event ===
                'USER_UPDATED' ||
              event ===
                'INITIAL_SESSION'
            ) {
              void applySession(
                session
              )
            }
          }
        )

    return () => {
      active = false

      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (checking) {
      return
    }

    const isPublicRoute =
      PUBLIC_ROUTES.includes(
        pathname
      )

    if (
      !authenticated ||
      !profile
    ) {
      if (
        !isPublicRoute
      ) {
        router.replace(
          '/login'
        )
      }

      return
    }

    if (barNukuHost) {
      if (
        isPublicRoute
      ) {
        router.replace(
          '/bar'
        )
      }

      return
    }

    if (
      requisitionHost
    ) {
      if (
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

      return
    }

    if (
      profile.role ===
      'requisitionnaire'
    ) {
      window.location.replace(
        'https://requisitionnuku.fenuaprobartender.com/requisition'
      )

      return
    }

    if (
      isPublicRoute
    ) {
      router.replace('/')
    }
  }, [
    pathname,
    checking,
    authenticated,
    profile,
    barNukuHost,
    requisitionHost,
    router,
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
        Vérification de la session...
      </div>
    )
  }

  const isPublicRoute =
    PUBLIC_ROUTES.includes(
      pathname
    )

  if (
    isPublicRoute
  ) {
    return (
      <>
        {children}
      </>
    )
  }

  if (
    !authenticated ||
    !profile
  ) {
    return null
  }

  if (
    requisitionHost
  ) {
    return (
      <>
        {children}
      </>
    )
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  )
}