'use client'

import {
  useEffect,
  useState,
} from 'react'

type BeforeInstallPromptEvent =
  Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{
      outcome:
        | 'accepted'
        | 'dismissed'
      platform: string
    }>
  }

export default function PwaInstallButton() {
  const [
    deferredPrompt,
    setDeferredPrompt,
  ] =
    useState<BeforeInstallPromptEvent | null>(
      null
    )

  const [installed, setInstalled] =
    useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia(
        '(display-mode: standalone)'
      ).matches

    const navigatorStandalone =
      Boolean(
        (
          window.navigator as Navigator & {
            standalone?: boolean
          }
        ).standalone
      )

    if (
      standalone ||
      navigatorStandalone
    ) {
      setInstalled(true)
    }

    const onBeforeInstallPrompt = (
      event: Event
    ) => {
      event.preventDefault()

      setDeferredPrompt(
        event as BeforeInstallPromptEvent
      )
    }

    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener(
      'beforeinstallprompt',
      onBeforeInstallPrompt
    )

    window.addEventListener(
      'appinstalled',
      onInstalled
    )

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        onBeforeInstallPrompt
      )

      window.removeEventListener(
        'appinstalled',
        onInstalled
      )
    }
  }, [])

  if (installed) {
    return (
      <span className="pwaInstalled">
        ✓ Bar Nuku installé
      </span>
    )
  }

  const installApp = async () => {
    if (!deferredPrompt) {
      /*
       * Sur iPhone/iPad, l'installation
       * passe par Partager > Sur l'écran
       * d'accueil. Sur certains navigateurs
       * desktop, le bouton d'installation
       * se trouve dans la barre d'adresse.
       */
      window.alert(
        'Pour installer Bar Nuku : utilise le menu du navigateur puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».'
      )
      return
    }

    await deferredPrompt.prompt()
    await deferredPrompt.userChoice

    setDeferredPrompt(null)
  }

  return (
    <button
      type="button"
      className="pwaInstallButton"
      onClick={installApp}
    >
      ↓ Installer Bar Nuku
    </button>
  )
}