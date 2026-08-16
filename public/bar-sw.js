/* public/bar-sw.js */

self.addEventListener(
  'push',
  (event) => {
    let payload = {}

    try {
      payload =
        event.data
          ? event.data.json()
          : {}
    } catch {
      payload = {
        title:
          'Bar Nuku',
        body:
          event.data
            ? event.data.text()
            : 'Nouvelle réquisition',
      }
    }

    const title =
      payload.title ||
      'Bar Nuku'

    const requestId =
      payload.requestId ||
      ''

    const url =
      requestId
        ? `/bar?request=${encodeURIComponent(
            requestId
          )}`
        : '/bar'

    const options = {
      body:
        payload.body ||
        'Nouvelle réquisition à traiter',

      icon:
        '/bar-nuku-192.png',

      badge:
        '/bar-nuku-192.png',

      tag:
        requestId
          ? `bar-requisition-${requestId}`
          : 'bar-requisition',

      renotify: true,

      requireInteraction:
        false,

      data: {
        url,
        requestId,
      },
    }

    event.waitUntil(
      Promise.all([
        /*
         * Notification système.
         */
        self.registration
          .showNotification(
            title,
            options
          ),

        /*
         * Badge "1" sur les plateformes
         * compatibles avec App Badging.
         *
         * Android Chrome gère son badge
         * directement à partir de la
         * notification non lue.
         */
        typeof self.navigator
          .setAppBadge ===
        'function'
          ? self.navigator
              .setAppBadge(1)
          : Promise.resolve(),
      ])
    )
  }
)

/*
 * Quand le barman appuie
 * sur la notification.
 */
self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close()

    const url =
      event.notification
        ?.data?.url ||
      '/bar'

    event.waitUntil(
      Promise.all([
        /*
         * On retire le badge
         * sur les plateformes compatibles.
         */
        typeof self.navigator
          .clearAppBadge ===
        'function'
          ? self.navigator
              .clearAppBadge()
          : Promise.resolve(),

        /*
         * Ouvre directement
         * la réquisition concernée.
         */
        clients
          .matchAll({
            type: 'window',
            includeUncontrolled:
              true,
          })
          .then(
            (
              clientList
            ) => {
              for (
                const client of
                clientList
              ) {
                if (
                  'focus' in
                  client
                ) {
                  client.navigate(
                    url
                  )

                  return client.focus()
                }
              }

              if (
                clients.openWindow
              ) {
                return clients
                  .openWindow(
                    url
                  )
              }

              return undefined
            }
          ),
      ])
    )
  }
)