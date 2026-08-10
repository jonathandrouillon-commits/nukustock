'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type LoginZone =
  | 'Beverage'
  | 'Food'
  | 'Matériel & Accessoires'
  | 'All'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [zone, setZone] = useState<LoginZone>('All')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError("Renseigne l'adresse email et le mot de passe.")
      return
    }

    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError('Email ou mot de passe incorrect.')
      return
    }

    localStorage.setItem('nukustock_login_zone', zone)

    const destination =
      zone === 'Beverage'
        ? '/inventory?scope=beverage'
        : zone === 'Food'
        ? '/inventory?scope=food'
        : zone === 'Matériel & Accessoires'
        ? '/inventory?scope=equipment'
        : '/'

    router.replace(destination)
    router.refresh()
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
          width: 'min(500px,100%)',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 22,
          padding: 28,
          boxShadow: '0 20px 60px rgba(16,24,40,.10)',
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
                letterSpacing: '.12em',
                fontWeight: 800,
              }}
            >
              NUKUTEPIPI
            </div>
            <h1 style={{ margin: '2px 0 0', fontSize: 22 }}>NukuStock</h1>
          </div>
        </div>

        <h2 style={{ margin: 0, fontSize: 28 }}>Connexion</h2>
        <p style={{ margin: '6px 0 22px', color: '#667085' }}>
          Accéder à NukuStock
        </p>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              marginBottom: 16,
              background: '#fff0f0',
              border: '1px solid #fecaca',
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
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <label>
            <span
              style={{
                display: 'block',
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
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{
                width: '100%',
                minHeight: 46,
                border: '1px solid #d0d5dd',
                borderRadius: 12,
                padding: '0 12px',
              }}
            />
          </label>

          <label>
            <span
              style={{
                display: 'block',
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
                gridTemplateColumns: '1fr auto',
                gap: 8,
              }}
            >
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  minHeight: 46,
                  border: '1px solid #d0d5dd',
                  borderRadius: 12,
                  padding: '0 12px',
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                style={{
                  border: '1px solid #d0d5dd',
                  borderRadius: 12,
                  padding: '0 12px',
                  background: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </label>

          <label>
            <span
              style={{
                display: 'block',
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
                setZone(e.target.value as LoginZone)
              }
              style={{
                width: '100%',
                minHeight: 46,
                border: '1px solid #d0d5dd',
                borderRadius: 12,
                padding: '0 12px',
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

            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: '#667085',
                lineHeight: 1.35,
              }}
            >
              Après connexion, NukuStock ouvrira directement
              la zone sélectionnée.
            </div>
          </label>

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
              cursor: 'pointer',
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

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
      </section>
    </main>
  )
}