'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type CurrentUser = {
  name: string
  email: string
  department: string
  role: string
}

type LoginZone =
  | 'Beverage'
  | 'Food'
  | 'Matériel & Accessoires'
  | 'All'

export function UserMenu() {
  const router = useRouter()

  const menuRef =
    useRef<HTMLDivElement>(null)

  const logoutInProgress =
    useRef(false)

  const [open, setOpen] =
    useState(false)

  const [loggingOut, setLoggingOut] =
    useState(false)

  const [zone, setZone] =
    useState<LoginZone>('All')

  const [user, setUser] =
    useState<CurrentUser>({
      name: 'Utilisateur',
      email: '',
      department: '',
      role: '',
    })

  useEffect(() => {
    const savedZone =
      localStorage.getItem(
        'nukustock_login_zone'
      ) as LoginZone | null

    if (
      savedZone === 'Beverage' ||
      savedZone === 'Food' ||
      savedZone ===
        'Matériel & Accessoires' ||
      savedZone === 'All'
    ) {
      setZone(savedZone)
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      /*
       * getSession() lit la session locale.
       * Cela évite un appel réseau getUser()
       * inutile à chaque montage du menu.
       */
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession()

      if (
        !active ||
        !session?.user
      ) {
        return
      }

      const authUser =
        session.user

      const metadata =
        authUser.user_metadata || {}

      const appMetadata =
        authUser.app_metadata || {}

      const employeeName =
        String(
          appMetadata.employee_name ||
          ''
        ).trim()

      setUser({
        name:
          employeeName ||
          metadata.full_name ||
          `${metadata.first_name || ''} ${
            metadata.last_name || ''
          }`.trim() ||
          authUser.email ||
          'Utilisateur',

        email:
          authUser.email || '',

        department:
          metadata.department ||
          '',

        role:
          appMetadata.bar_role ||
          metadata.role ||
          '',
      })
    }

    void loadUser()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const closeOnOutsideClick = (
      event: MouseEvent
    ) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      closeOnOutsideClick
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        closeOnOutsideClick
      )
    }
  }, [])

  const disconnectAndGoToLogin =
    async (
      switchUser = false
    ) => {
      /*
       * Protection anti double-clic /
       * double signOut.
       */
      if (
        logoutInProgress.current
      ) {
        return
      }

      logoutInProgress.current =
        true

      setLoggingOut(true)
      setOpen(false)

      try {
        /*
         * scope local :
         * on supprime uniquement
         * la session de ce navigateur.
         */
        const { error } =
          await supabase.auth.signOut({
            scope: 'local',
          })

        /*
         * Même si Supabase retourne
         * temporairement un rate-limit,
         * on tente quand même de revenir
         * au login après nettoyage local.
         */
        if (error) {
          console.warn(
            'Déconnexion Supabase :',
            error.message
          )
        }

        localStorage.removeItem(
          'nukustock_login_zone'
        )

        const destination =
          switchUser
            ? '/login?switch=1'
            : '/login'

        /*
         * Un seul changement de page.
         * Pas de router.refresh()
         * après signOut.
         */
        window.location.replace(
          destination
        )
      } catch (error) {
        console.error(
          'Erreur déconnexion :',
          error
        )

        window.location.replace(
          switchUser
            ? '/login?switch=1'
            : '/login'
        )
      }
    }

  const changeZone = (
    nextZone: LoginZone
  ) => {
    setZone(nextZone)

    localStorage.setItem(
      'nukustock_login_zone',
      nextZone
    )

    setOpen(false)

    const destination =
      nextZone === 'Beverage'
        ? '/inventory?scope=beverage'
        : nextZone === 'Food'
        ? '/inventory?scope=food'
        : nextZone ===
          'Matériel & Accessoires'
        ? '/inventory?scope=equipment'
        : '/'

    router.push(destination)
  }

  const initials =
    user.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(
        part =>
          part[0]?.toUpperCase()
      )
      .join('') || 'U'

  return (
    <div
      ref={menuRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        disabled={loggingOut}
        onClick={() =>
          setOpen(
            value => !value
          )
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border:
            '1px solid #e5e7eb',
          background: '#fff',
          borderRadius: 14,
          padding:
            '7px 10px 7px 7px',
          cursor:
            loggingOut
              ? 'wait'
              : 'pointer',
          color: '#101828',
          opacity:
            loggingOut
              ? 0.65
              : 1,
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: '#0b1220',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          {initials}
        </span>

        <span
          className="userMenuIdentity"
          style={{
            textAlign: 'left',
          }}
        >
          <strong
            style={{
              display: 'block',
              fontSize: 12,
            }}
          >
            {loggingOut
              ? 'Déconnexion...'
              : user.name}
          </strong>

          <span
            style={{
              display: 'block',
              marginTop: 2,
              fontSize: 10,
              color: '#667085',
            }}
          >
            {[
              user.department,
              user.role,
            ]
              .filter(Boolean)
              .join(' · ') ||
              user.email}
          </span>

          <span
            style={{
              display: 'block',
              marginTop: 2,
              fontSize: 9,
              color: '#98a2b3',
              fontWeight: 700,
            }}
          >
            Zone : {zone}
          </span>
        </span>

        <span
          style={{
            color: '#667085',
          }}
        >
          ▾
        </span>
      </button>

      {open && !loggingOut && (
        <div
          style={{
            position: 'absolute',
            top:
              'calc(100% + 8px)',
            right: 0,
            width: 280,
            background: '#fff',
            border:
              '1px solid #e5e7eb',
            borderRadius: 16,
            boxShadow:
              '0 18px 50px rgba(16,24,40,.16)',
            overflow: 'hidden',
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom:
                '1px solid #e5e7eb',
            }}
          >
            <strong
              style={{
                display: 'block',
              }}
            >
              {user.name}
            </strong>

            {user.email && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: '#667085',
                }}
              >
                {user.email}
              </div>
            )}

            {(user.department ||
              user.role) && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {[
                  user.department,
                  user.role,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
          </div>

          <div
            style={{
              padding: 14,
              borderBottom:
                '1px solid #e5e7eb',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#667085',
                textTransform:
                  'uppercase',
                letterSpacing:
                  '.08em',
                marginBottom: 8,
              }}
            >
              Zone de travail
            </div>

            <select
              value={zone}
              onChange={event =>
                changeZone(
                  event.target
                    .value as LoginZone
                )
              }
              style={{
                width: '100%',
                minHeight: 40,
                border:
                  '1px solid #d0d5dd',
                borderRadius: 10,
                background: '#fff',
                color: '#101828',
                padding: '0 10px',
                fontWeight: 700,
              }}
            >
              <option value="All">
                All — Accès général
              </option>

              <option value="Beverage">
                Beverage
              </option>

              <option value="Food">
                Food
              </option>

              <option
                value="Matériel & Accessoires"
              >
                Matériel &
                Accessoires
              </option>
            </select>
          </div>

          <button
            type="button"
            disabled={loggingOut}
            onClick={() =>
              void disconnectAndGoToLogin(
                true
              )
            }
            style={{
              width: '100%',
              border: 0,
              background: '#fff',
              padding:
                '12px 14px',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ⇄ Changer
            d&apos;utilisateur
          </button>

          <button
            type="button"
            disabled={loggingOut}
            onClick={() =>
              void disconnectAndGoToLogin(
                false
              )
            }
            style={{
              width: '100%',
              border: 0,
              borderTop:
                '1px solid #f2f4f7',
              background: '#fff',
              padding:
                '12px 14px',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 800,
              color: '#b42318',
            }}
          >
            ⎋ Déconnexion
          </button>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 760px) {
          .userMenuIdentity {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}