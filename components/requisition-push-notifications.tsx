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

function arrayBuffersEqual(
  first: ArrayBuffer | null,
  second: Uint8Array
) {
  if (!first) return false

  const firstArray = new Uint8Array(first)

  if (firstArray.length !== second.length) {
    return false
  }

  for (let index = 0; index < firstArray.length; index += 1) {
    if (firstArray[index] !== second[index]) {
      return false
    }
  }

  return true
}

export default function RequisitionPushNotifications() {
  const [state, setState] =
    useState<PermissionState>('default')
  const [loading, setLoading] =
    useState(false)
  const [message, setMessage] =
    useState('')

  const syncPushSubscription =
    async (requestPermission: boolean) => {
      const publicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!publicKey) {
        throw new Error(
          'NEXT_PUBLIC_VAPID_PUBLIC_KEY manquante.'
        )
      }

      let permission = Notification.permission

      if (
        permission === 'default' &&
        requestPermission
      ) {
        permission =
          await Notification.requestPermission()
      }

      if (permission !== 'granted') {
        setState(
          permission === 'denied'
            ? 'denied'
            : 'default'
        )

        throw new Error(
          'Autorisation de notification non accordée.'
        )
      }

      const registration =
        await navigator.serviceWorker.register(
          '/requisition-sw.js',
          { scope: '/' }
        )

      await navigator.serviceWorker.ready

      const vapidKey =
        urlBase64ToUint8Array(publicKey)

      let subscription =
        await registration.pushManager.getSubscription()

      if (subscription) {
        const existingKey =
          subscription.options.applicationServerKey

        if (
          !arrayBuffersEqual(
            existingKey,
            vapidKey
          )
        ) {
          await subscription.unsubscribe()
          subscription = null
        }
      }

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey,
          })
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

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
            channel: 'requisition_nuku',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'endpoint',
          }
        )

      if (error) throw error

      setState('enabled')
      return subscription
    }

  useEffect(() => {
    const initialize = async () => {
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
        try {
          setLoading(true)
          await syncPushSubscription(false)
          setMessage(
            'Notifications Réquisition Nuku actives.'
          )
        } catch (caughtError) {
          console.error(
            'Synchronisation notifications Réquisition Nuku:',
            caughtError
          )

          setState('granted')
          setMessage(
            caughtError instanceof Error
              ? caughtError.message
              : 'Impossible de synchroniser les notifications.'
          )
        } finally {
          setLoading(false)
        }
        return
      }

      setState('default')
    }

    void initialize()
  }, [])

  const enableNotifications = async () => {
    setLoading(true)
    setMessage('')

    try {
      await syncPushSubscription(true)
      setMessage(
        'Notifications Réquisition Nuku activées.'
      )
    } catch (caughtError) {
      console.error(
        'Activation notifications Réquisition Nuku:',
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

  const testNotification = async () => {
    try {
      if (Notification.permission !== 'granted') {
        throw new Error(
          'Les notifications ne sont pas autorisées.'
        )
      }

      const registration =
        await navigator.serviceWorker.ready

      await registration.showNotification(
        'Test Réquisition Nuku',
        {
          body:
            'Les notifications Réquisition Nuku fonctionnent sur cet appareil.',
          tag:
            'requisition-nuku-test',
        }
      )

      setMessage(
        'Notification test envoyée.'
      )
    } catch (caughtError) {
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'Erreur notification test.'
      )
    }
  }

  if (state === 'unsupported') {
    return null
  }

  if (state === 'enabled') {
    return (
      <div className="requisitionPushEnabled">
        <span>
          🔔 Notifications actives
        </span>

        <button
          type="button"
          onClick={testNotification}
        >
          Tester
        </button>

        {message && (
          <small>
            {message}
          </small>
        )}
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="requisitionPushDenied">
        Notifications bloquées dans le navigateur.
      </div>
    )
  }

  return (
    <div className="requisitionPushBox">
      <button
        type="button"
        onClick={enableNotifications}
        disabled={loading}
      >
        {loading
          ? 'Activation...'
          : '🔔 Activer les notifications'}
      </button>

      {message && (
        <small>
          {message}
        </small>
      )}
    </div>
  )
}