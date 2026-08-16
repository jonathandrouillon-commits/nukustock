'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PermissionState =
  | 'unsupported'
  | 'default'
  | 'denied'
  | 'granted'
  | 'enabled'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)

  return Uint8Array.from(
    [...rawData].map((character) => character.charCodeAt(0))
  )
}

export default function BarPushNotifications() {
  const [state, setState] =
    useState<PermissionState>('default')
  const [loading, setLoading] =
    useState(false)
  const [message, setMessage] =
    useState('')

  useEffect(() => {
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setState('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }

    if (Notification.permission === 'granted') {
      void navigator.serviceWorker
        .getRegistration('/')
        .then(async (registration) => {
          if (!registration) {
            setState('granted')
            return
          }

          const subscription =
            await registration.pushManager.getSubscription()

          setState(subscription ? 'enabled' : 'granted')
        })
      return
    }

    setState('default')
  }, [])

  const enableNotifications = async () => {
    setLoading(true)
    setMessage('')

    try {
      const publicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!publicKey) {
        throw new Error(
          'NEXT_PUBLIC_VAPID_PUBLIC_KEY manquante.'
        )
      }

      const permission =
        await Notification.requestPermission()

      if (permission !== 'granted') {
        setState(
          permission === 'denied'
            ? 'denied'
            : 'default'
        )
        setMessage(
          'Autorisation de notification non accordée.'
        )
        return
      }

      const registration =
        await navigator.serviceWorker.register(
          '/bar-sw.js',
          { scope: '/' }
        )

      await navigator.serviceWorker.ready

      let subscription =
        await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              urlBase64ToUint8Array(publicKey),
          })
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'Utilisateur non connecté.'
        )
      }

      const { error } = await supabase
        .from('bar_push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            endpoint: subscription.endpoint,
            subscription: subscription.toJSON(),
            channel: 'bar_nuku',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' }
        )

      if (error) throw error

      setState('enabled')
      setMessage(
        'Notifications Bar Nuku activées.'
      )
    } catch (caughtError) {
      console.error(
        'Activation notifications Bar Nuku:',
        caughtError
      )

      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'Impossible d’activer les notifications.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (state === 'unsupported') return null

  if (state === 'enabled') {
    return (
      <div className="barPushEnabled">
        <span>🔔 Notifications actives</span>
        {message && <small>{message}</small>}
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="barPushDenied">
        Notifications bloquées dans le navigateur.
      </div>
    )
  }

  return (
    <div className="barPushBox">
      <button
        type="button"
        className="barPushButton"
        onClick={enableNotifications}
        disabled={loading}
      >
        {loading
          ? 'Activation...'
          : '🔔 Activer les notifications'}
      </button>

      {message && <small>{message}</small>}
    </div>
  )
}