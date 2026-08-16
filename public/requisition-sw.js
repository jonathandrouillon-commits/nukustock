self.addEventListener('push', (event) => {
  let payload = {}

  try {
    payload = event.data
      ? event.data.json()
      : {}
  } catch {
    payload = {
      title: 'Réquisition Nuku',
      body: event.data
        ? event.data.text()
        : 'Votre réquisition a été traitée.',
    }
  }

  const title =
    payload.title || 'Réquisition Nuku'

  const requestId =
    payload.requestId || ''

  const url = requestId
    ? `/requisition?request=${encodeURIComponent(
        requestId
      )}`
    : '/requisition'

  event.waitUntil(
    self.registration.showNotification(
      title,
      {
        body:
          payload.body ||
          'Votre réquisition a été traitée.',

        tag: requestId
          ? `requisition-treated-${requestId}`
          : 'requisition-treated',

        renotify: true,

        data: {
          url,
          requestId,
        },
      }
    )
  )
})

self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close()

    const url =
      event.notification?.data?.url ||
      '/requisition'

    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then((clientList) => {
          for (const client of clientList) {
            if ('focus' in client) {
              client.navigate(url)
              return client.focus()
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(url)
          }

          return undefined
        })
    )
  }
)