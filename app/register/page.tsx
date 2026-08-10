'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const departments = [
  'Activités',
  'Bar',
  'Cafeteria',
  'Cuisine',
  'Direction',
  'Housekeeping',
  'Infirmerie',
  'Jardin',
  'Logistique',
  'Lune Rouge',
  'Maintenance',
  'Restaurant',
].sort((a, b) => a.localeCompare(b, 'fr'))

export default function RegisterPage() {
  const router = useRouter()

  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (
      !lastName.trim() ||
      !firstName.trim() ||
      !email.trim() ||
      !department
    ) {
      setError('Tous les champs sont obligatoires.')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          last_name: lastName.trim(),
          first_name: firstName.trim(),
          department,
          role: 'user',
          full_name: `${firstName.trim()} ${lastName.trim()}`,
        },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (data.session) {
      router.replace('/')
      router.refresh()
      return
    }

    setSuccess(
      "Compte créé. Vérifie ton email si la confirmation d'adresse est activée."
    )
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
          width: 'min(620px,100%)',
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

        <h2 style={{ margin: 0, fontSize: 28 }}>Créer un compte</h2>
        <p style={{ margin: '6px 0 22px', color: '#667085' }}>
          Inscription à NukuStock
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

        {success && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              marginBottom: 16,
              background: '#ecfdf3',
              border: '1px solid #abefc6',
              color: '#067647',
              fontSize: 13,
            }}
          >
            {success}
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <label>
              <span>Nom *</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
              <span>Prénom *</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 46,
                  border: '1px solid #d0d5dd',
                  borderRadius: 12,
                  padding: '0 12px',
                }}
              />
            </label>
          </div>

          <label>
            <span>Adresse email *</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            <span>Département / Service *</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{
                width: '100%',
                minHeight: 46,
                border: '1px solid #d0d5dd',
                borderRadius: 12,
                padding: '0 12px',
              }}
            >
              <option value="">Choisir un département</option>
              {departments.map((departmentName) => (
                <option key={departmentName} value={departmentName}>
                  {departmentName}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Mot de passe *</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            <span>Confirmer le mot de passe *</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                minHeight: 46,
                border: '1px solid #d0d5dd',
                borderRadius: 12,
                padding: '0 12px',
              }}
            />
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
            {loading ? 'Création...' : "S'inscrire"}
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
          Déjà un compte ?{' '}
          <Link
            href="/login"
            style={{
              color: '#2563eb',
              fontWeight: 800,
            }}
          >
            Se connecter
          </Link>
        </div>
      </section>
    </main>
  )
}