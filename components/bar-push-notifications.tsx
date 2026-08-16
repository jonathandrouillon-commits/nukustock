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
  const padding =
    '='.repeat((4 - (base64String.length % 4)) % 4)

  const base64 =
    (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

  const rawData =
    window.atob(base64)

  return Uint8Array.from(
    [...rawData].map(
      (character) =>
        character.charCodeAt(0)
    )
  )
}

function arrayBuffersEqual(
  first: ArrayBuffer | null,
  second: Uint8Array
) {
  if (!first) return false

  const firstArray =
    new Uint8Array(first)

  if (
    firstArray.length !==
    second.length
  ) {
    return false
  }

  for (
    let index = 0;
    index < firstArray.length;
    index += 1
  ) {
    if (
      firstArray[index] !==
      second[index]
    ) {
      return false
    }
  }

  return true
}

export default function BarPushNotifications() {
  const [state, setState] =
    useState<PermissionState>('default')

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState('')

  /**
   * Crée ou récupère l'abonnement Push
   * et l'enregistre systématiquement
   * dans Supabase.
   */
  const syncPushSubscription =
    async (
      requestPermission: boolean
    ) => {
      const publicKey =
        process.env
          .NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!publicKey) {
        throw new Error(
          'NEXT_PUBLIC_VAPID_PUBLIC_KEY manquante.'
        )
      }

      /**
       * Permission navigateur
       */
      let permission =
        Notification.permission

      if (
        permission === 'default' &&
        requestPermission
      ) {
        permission =
          await Notification.requestPermission()
      }

      if (
        permission !== 'granted'
      ) {
        setState(
          permission === 'denied'
            ? 'denied'
            : 'default'
        )

        throw new Error(
          'Autorisation de notification non accordée.'
        )
      }

      /**
       * Service Worker
       */
      const registration =
        await navigator.serviceWorker.register(
          '/bar-sw.js',
          {
            scope: '/',
          }
        )

      await navigator.serviceWorker.ready

      const vapidKey =
        urlBase64ToUint8Array(
          publicKey
        )

      /**
       * Subscription existante Chrome
       */
      let subscription =
        await registration.pushManager
          .getSubscription()

      /**
       * Si la subscription utilise
       * une ancienne clé VAPID,
       * on la supprime.
       */
      if (subscription) {
        const existingKey =
          subscription.options
            .applicationServerKey

        const sameKey =
          arrayBuffersEqual(
            existingKey,
            vapidKey
          )

        if (!sameKey) {
          console.log(
            'Ancienne clé VAPID détectée : suppression de la subscription.'
          )

          await subscription.unsubscribe()

          subscription = null
        }
      }

      /**
       * Création d'une nouvelle subscription
       */
      if (!subscription) {
        subscription =
          await registration.pushManager
            .subscribe({
              userVisibleOnly: true,
              applicationServerKey:
                vapidKey,
            })
      }

      /**
       * Utilisateur connecté Supabase
       */
      const {
        data: {
          user,
        },
        error: userError,
      } =
        await supabase.auth
          .getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'Utilisateur non connecté.'
        )
      }

      /**
       * Enregistrement / resynchronisation
       * de la subscription dans Supabase.
       */
      const {
        error: subscriptionError,
      } =
        await supabase
          .from(
            'bar_push_subscriptions'
          )
          .upsert(
            {
              user_id:
                user.id,

              endpoint:
                subscription.endpoint,

              subscription:
                subscription.toJSON(),

              channel:
                'bar_nuku',

              updated_at:
                new Date()
                  .toISOString(),
            },
            {
              onConflict:
                'endpoint',
            }
          )

      if (
        subscriptionError
      ) {
        console.error(
          'Erreur enregistrement subscription Supabase:',
          subscriptionError
        )

        throw subscriptionError
      }

      console.log(
        'Subscription Bar Nuku enregistrée:',
        subscription.endpoint
      )

      setState('enabled')

      return subscription
    }

  /**
   * Test LOCAL de notification.
   *
   * Ce test ne passe PAS par :
   * - la réquisition
   * - Supabase Edge Function
   * - FCM
   *
   * Il vérifie uniquement si Android/Chrome
   * peut afficher une notification.
   */
  const testNotification =
    async () => {
      setMessage('')

      try {
        if (
          !(
            'serviceWorker' in
            navigator
          )
        ) {
          throw new Error(
            'Service Worker non disponible.'
          )
        }

        if (
          Notification.permission !==
          'granted'
        ) {
          throw new Error(
            'Les notifications ne sont pas autorisées.'
          )
        }

        const registration =
          await navigator.serviceWorker
            .ready

        await registration
          .showNotification(
            'Test Bar Nuku',
            {
              body:
                'Si tu vois cette notification, Bar Nuku peut afficher les notifications sur ce téléphone.',
              tag:
                'bar-nuku-test',
              requireInteraction:
                false,
            }
          )

        setMessage(
          'Notification test envoyée.'
        )
      } catch (
        caughtError
      ) {
        console.error(
          'Test notification Bar Nuku:',
          caughtError
        )

        setMessage(
          caughtError instanceof Error
            ? caughtError.message
            : 'Impossible d’afficher la notification test.'
        )
      }
    }

  /**
   * Initialisation
   */
  useEffect(() => {
    const initialize =
      async () => {
        if (
          !(
            'serviceWorker' in
            navigator
          ) ||
          !(
            'PushManager' in
            window
          ) ||
          !(
            'Notification' in
            window
          )
        ) {
          setState(
            'unsupported'
          )

          return
        }

        if (
          Notification.permission ===
          'denied'
        ) {
          setState(
            'denied'
          )

          return
        }

        /**
         * Si Chrome a déjà l'autorisation,
         * on resynchronise automatiquement
         * l'abonnement avec Supabase.
         */
        if (
          Notification.permission ===
          'granted'
        ) {
          try {
            setLoading(true)

            await syncPushSubscription(
              false
            )

            setMessage(
              'Notifications Bar Nuku actives.'
            )
          } catch (
            caughtError
          ) {
            console.error(
              'Synchronisation notifications Bar Nuku:',
              caughtError
            )

            setState(
              'granted'
            )

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

        setState(
          'default'
        )
      }

    void initialize()
  }, [])

  /**
   * Activation manuelle
   */
  const enableNotifications =
    async () => {
      setLoading(true)
      setMessage('')

      try {
        await syncPushSubscription(
          true
        )

        setMessage(
          'Notifications Bar Nuku activées.'
        )
      } catch (
        caughtError
      ) {
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

  /**
   * Navigateur incompatible
   */
  if (
    state ===
    'unsupported'
  ) {
    return null
  }

  /**
   * Notifications activées
   */
  if (
    state ===
    'enabled'
  ) {
    return (
      <div className="barPushEnabled">
        <span>
          🔔 Notifications actives
        </span>

        <button
          type="button"
          className="barPushButton"
          onClick={
            testNotification
          }
        >
          Tester la notification
        </button>

        {message && (
          <small>
            {message}
          </small>
        )}
      </div>
    )
  }

  /**
   * Notifications bloquées
   */
  if (
    state ===
    'denied'
  ) {
    return (
      <div className="barPushDenied">
        Notifications bloquées
        dans le navigateur.
      </div>
    )
  }

  /**
   * Notifications pas encore activées
   */
  return (
    <div className="barPushBox">
      <button
        type="button"
        className="barPushButton"
        onClick={
          enableNotifications
        }
        disabled={
          loading
        }
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