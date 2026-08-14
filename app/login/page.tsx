'use client'

import Link from 'next/link'
import {
  FormEvent,
  useEffect,
  useState,
} from 'react'

import { supabase } from '@/lib/supabase'

type LoginZone =
  | 'Beverage'
  | 'Food'
  | 'Matériel & Accessoires'
  | 'All'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
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

export default function LoginPage() {
  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [zone, setZone] =
    useState<LoginZone>('All')

  const [
    showPassword,
    setShowPassword,
  ] = useState(false)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [
    requisitionMode,
    setRequisitionMode,
  ] = useState(false)

  const [
    installPrompt,
    setInstallPrompt,
  ] = useState<BeforeInstallPromptEvent | null>(null)

  const [
    appInstalled,
    setAppInstalled,
  ] = useState(false)

  const [
    installMessage,
    setInstallMessage,
  ] = useState('')

  useEffect(() => {
    const isRequisition =
      isRequisitionHost()

    setRequisitionMode(
      isRequisition
    )

    if (!isRequisition) {
      return
    }

    const standalone =
      window.matchMedia(
        '(display-mode: standalone)'
      ).matches ||
      (
        window.navigator as Navigator & {
          standalone?: boolean
        }
      ).standalone === true

    if (standalone) {
      setAppInstalled(true)
    }

    const handleBeforeInstallPrompt = (
      event: Event
    ) => {
      event.preventDefault()
      setInstallPrompt(
        event as BeforeInstallPromptEvent
      )
      setInstallMessage('')
    }

    const handleAppInstalled = () => {
      setAppInstalled(true)
      setInstallPrompt(null)
      setInstallMessage(
        'Application installée.'
      )
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    )

    window.addEventListener(
      'appinstalled',
      handleAppInstalled
    )

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )

      window.removeEventListener(
        'appinstalled',
        handleAppInstalled
      )
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) {
      setInstallMessage(
        'L’installation automatique n’est pas disponible pour le moment. Utilise le menu du navigateur puis “Installer l’application” ou “Ajouter à l’écran d’accueil”.'
      )
      return
    }

    await installPrompt.prompt()

    const choice =
      await installPrompt.userChoice

    if (
      choice.outcome === 'accepted'
    ) {
      setInstallMessage(
        'Installation lancée.'
      )
    } else {
      setInstallMessage(
        'Installation annulée.'
      )
    }

    setInstallPrompt(null)
  }

  const submit = async (
    event: FormEvent
  ) => {
    event.preventDefault()
    setError('')

    if (
      !email.trim() ||
      !password
    ) {
      setError(
        "Renseigne l'adresse email et le mot de passe."
      )
      return
    }

    setLoading(true)

    try {
      const {
        data,
        error: signInError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email:
              email
                .trim()
                .toLowerCase(),
            password,
          }
        )

      if (
        signInError ||
        !data.session ||
        !data.user
      ) {
        setError(
          'Email ou mot de passe incorrect.'
        )
        setLoading(false)
        return
      }

      // On ne fait aucune lecture "profiles" ici.
      // Le contrôle du rôle est fait par AuthGate
      // sur la page protégée après la redirection.
      if (requisitionMode) {
        window.location.replace(
          '/requisition'
        )
        return
      }

      localStorage.setItem(
        'nukustock_login_zone',
        zone
      )

      const destination =
        zone === 'Beverage'
          ? '/inventory?scope=beverage'
          : zone === 'Food'
          ? '/inventory?scope=food'
          : zone ===
            'Matériel & Accessoires'
          ? '/inventory?scope=equipment'
          : '/'

      window.location.replace(
        destination
      )
    } catch (caughtError) {
      console.error(
        'Erreur connexion:',
        caughtError
      )

      setError(
        'La connexion a rencontré une erreur. Réessaie.'
      )
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#f4f6f9',
      }}
    >
      <section
        style={{
          width:
            'min(500px,100%)',
          background: '#fff',
          border:
            '1px solid #e5e7eb',
          borderRadius: 22,
          padding: 28,
          boxShadow:
            '0 20px 60px rgba(16,24,40,.10)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 24,
          }}
        >
          <img
            src="/images/nukutepipi.jpg"
            alt="Nukutepipi"
            style={{
              width: 76,
              height: 58,
              objectFit: 'contain',
              borderRadius: 12,
            }}
          />

          <div>
            <div
              style={{
                fontSize: 10,
                color: '#667085',
                letterSpacing:
                  '.12em',
                fontWeight: 800,
              }}
            >
              NUKUTEPIPI
            </div>

            <h1
              style={{
                margin:
                  '2px 0 0',
                fontSize: 22,
              }}
            >
              {requisitionMode
                ? 'Requisition Nuku'
                : 'NukuStock'}
            </h1>
          </div>
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: 28,
          }}
        >
          Connexion
        </h2>

        <p
          style={{
            margin:
              '6px 0 22px',
            color: '#667085',
          }}
        >
          {requisitionMode
            ? 'Créer et suivre vos réquisitions'
            : 'Accéder à NukuStock'}
        </p>

        {requisitionMode && (
          <div
            style={{
              marginBottom: 18,
              display: 'grid',
              gap: 8,
            }}
          >
            {appInstalled ? (
              <div
                style={{
                  minHeight: 46,
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border:
                    '1px solid #abefc6',
                  borderRadius: 12,
                  background:
                    '#ecfdf3',
                  color: '#067647',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                ✓ Application installée
              </div>
            ) : (
              <button
                type="button"
                onClick={installApp}
                style={{
                  minHeight: 48,
                  border:
                    '1px solid #0b1220',
                  borderRadius: 12,
                  background: '#fff',
                  color: '#0b1220',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Télécharger l’app
              </button>
            )}

            {installMessage && (
              <div
                style={{
                  color: '#667085',
                  fontSize: 11,
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}
              >
                {installMessage}
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              padding:
                '12px 14px',
              borderRadius: 12,
              marginBottom: 16,
              background:
                '#fff0f0',
              border:
                '1px solid #fecaca',
              color: '#b42318',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={submit}
          style={{
            display: 'flex',
            flexDirection:
              'column',
            gap: 16,
          }}
        >
          <label>
            <span
              style={{
                display:
                  'block',
                fontSize: 12,
                fontWeight: 700,
                color: '#344054',
                marginBottom: 7,
              }}
            >
              Adresse email
            </span>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              autoComplete="email"
              style={{
                width: '100%',
                minHeight: 46,
                border:
                  '1px solid #d0d5dd',
                borderRadius: 12,
                padding:
                  '0 12px',
                boxSizing:
                  'border-box',
              }}
            />
          </label>

          <label>
            <span
              style={{
                display:
                  'block',
                fontSize: 12,
                fontWeight: 700,
                color: '#344054',
                marginBottom: 7,
              }}
            >
              Mot de passe
            </span>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr auto',
                gap: 8,
              }}
            >
              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                autoComplete="current-password"
                style={{
                  width: '100%',
                  minWidth: 0,
                  minHeight: 46,
                  border:
                    '1px solid #d0d5dd',
                  borderRadius: 12,
                  padding:
                    '0 12px',
                  boxSizing:
                    'border-box',
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value
                  )
                }
                style={{
                  border:
                    '1px solid #d0d5dd',
                  borderRadius: 12,
                  padding:
                    '0 12px',
                  background:
                    '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {showPassword
                  ? 'Masquer'
                  : 'Afficher'}
              </button>
            </div>
          </label>

          {!requisitionMode && (
            <label>
              <span
                style={{
                  display:
                    'block',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#344054',
                  marginBottom: 7,
                }}
              >
                Zone de travail
              </span>

              <select
                value={zone}
                onChange={(e) =>
                  setZone(
                    e.target
                      .value as LoginZone
                  )
                }
                style={{
                  width: '100%',
                  minHeight: 46,
                  border:
                    '1px solid #d0d5dd',
                  borderRadius: 12,
                  padding:
                    '0 12px',
                  background: '#fff',
                  color: '#101828',
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

                <option value="Matériel & Accessoires">
                  Matériel & Accessoires
                </option>
              </select>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              border: 0,
              minHeight: 48,
              borderRadius: 12,
              background: '#0b1220',
              color: '#fff',
              fontWeight: 800,
              cursor:
                loading
                  ? 'wait'
                  : 'pointer',
              opacity:
                loading
                  ? 0.8
                  : 1,
            }}
          >
            {loading
              ? 'Connexion...'
              : 'Se connecter'}
          </button>
        </form>

        {!requisitionMode && (
          <div
            style={{
              marginTop: 20,
              textAlign: 'center',
              fontSize: 13,
              color: '#667085',
            }}
          >
            Pas encore de compte ?{' '}
            <Link
              href="/register"
              style={{
                color: '#2563eb',
                fontWeight: 800,
              }}
            >
              Créer un compte
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}