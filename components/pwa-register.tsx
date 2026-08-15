'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .catch((error) => {
        console.error(
          'Erreur Service Worker Bar Nuku :',
          error
        )
      })
  }, [])

  return null
}
