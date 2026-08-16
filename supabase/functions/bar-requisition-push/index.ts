import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: {
    id: string
    request_number?: string | null
    department_id?: string | null
    destination_location_id?: string | null
  }
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ||
    'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

Deno.serve(async (request: Request) => {
  try {
    /*
     * --------------------------------------------------
     * 1. Vérification du secret webhook
     * --------------------------------------------------
     */

    const expectedSecret =
      Deno.env.get(
        'BAR_PUSH_WEBHOOK_SECRET'
      ) || ''

    const incomingSecret =
      request.headers.get(
        'x-bar-push-secret'
      ) || ''

    if (
      !expectedSecret ||
      incomingSecret !== expectedSecret
    ) {
      console.error(
        'Webhook secret invalide'
      )

      return new Response(
        'Unauthorized',
        {
          status: 401,
        }
      )
    }

    /*
     * --------------------------------------------------
     * 2. Lecture du payload
     * --------------------------------------------------
     */

    const payload =
      (await request.json()) as
        WebhookPayload

    console.log(
      'Webhook reçu:',
      payload.type,
      payload.table
    )

    if (
      payload.type !== 'INSERT' ||
      payload.table !==
        'internal_requests'
    ) {
      return Response.json({
        ok: true,
        ignored: true,
      })
    }

    const record =
      payload.record

    /*
     * --------------------------------------------------
     * 3. Département
     * --------------------------------------------------
     */

    let departmentName =
      'Service'

    if (
      record.department_id
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from('departments')
          .select('name')
          .eq(
            'id',
            record.department_id
          )
          .maybeSingle()

      if (error) {
        console.error(
          'Erreur département:',
          error
        )
      }

      if (data?.name) {
        departmentName =
          data.name
      }
    }

    /*
     * --------------------------------------------------
     * 4. Destination
     * --------------------------------------------------
     */

    let destinationName =
      ''

    if (
      record
        .destination_location_id
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'storage_locations'
          )
          .select('name')
          .eq(
            'id',
            record
              .destination_location_id
          )
          .maybeSingle()

      if (error) {
        console.error(
          'Erreur destination:',
          error
        )
      }

      if (data?.name) {
        destinationName =
          data.name
      }
    }

    /*
     * --------------------------------------------------
     * 5. Nombre de produits
     * --------------------------------------------------
     */

    const {
      count: lineCount,
      error: lineCountError,
    } =
      await supabase
        .from(
          'internal_request_lines'
        )
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'request_id',
          record.id
        )

    if (lineCountError) {
      console.error(
        'Erreur comptage lignes:',
        lineCountError
      )
    }

    /*
     * --------------------------------------------------
     * 6. Abonnements Bar Nuku
     * --------------------------------------------------
     */

    const {
      data: subscriptions,
      error:
        subscriptionsError,
    } =
      await supabase
        .from(
          'bar_push_subscriptions'
        )
        .select(
          `
            id,
            user_id,
            endpoint,
            subscription,
            channel
          `
        )
        .eq(
          'channel',
          'bar_nuku'
        )

    if (
      subscriptionsError
    ) {
      console.error(
        'Erreur abonnements:',
        subscriptionsError
      )

      throw subscriptionsError
    }

    console.log(
      'Bar subscriptions found:',
      subscriptions?.length ??
        0
    )

    console.log(
      'Subscriptions:',
      (
        subscriptions || []
      ).map((item) => ({
        id: item.id,
        userId:
          item.user_id,
        channel:
          item.channel,
        endpoint:
          item.endpoint
            ?.slice(0, 70),
      }))
    )

    /*
     * --------------------------------------------------
     * 7. Message
     * --------------------------------------------------
     */

    const requestNumber =
      record.request_number ||
      record.id

    const bodyParts = [
      `${requestNumber} · ${departmentName}`,
      destinationName
        ? `Destination : ${destinationName}`
        : '',
      typeof lineCount ===
        'number'
        ? `${lineCount} produit${
            lineCount > 1
              ? 's'
              : ''
          }`
        : '',
    ].filter(Boolean)

    const body =
      bodyParts.join(' · ')

    const notification =
      JSON.stringify({
        title:
          'Nouvelle réquisition Bar Nuku',
        body,
        requestId:
          record.id,
        requestNumber,
      })

    /*
     * --------------------------------------------------
     * 8. Envoi Push
     * --------------------------------------------------
     */

    let sent = 0
    let removed = 0
    let failed = 0

    const failures: Array<{
      id: string
      statusCode?: number
      message: string
    }> = []

    for (
      const row of
        subscriptions || []
    ) {
      try {
        console.log(
          'Envoi push vers:',
          row.id
        )

        await webpush
          .sendNotification(
            row.subscription,
            notification
          )

        sent += 1

        console.log(
          'Push envoyé:',
          row.id
        )
      } catch (
        caughtError: any
      ) {
        failed += 1

        const statusCode =
          Number(
            caughtError
              ?.statusCode ||
              caughtError
                ?.status ||
              0
          )

        const message =
          caughtError
            ?.body ||
          caughtError
            ?.message ||
          String(
            caughtError
          )

        console.error(
          'Push failed:',
          {
            subscriptionId:
              row.id,
            endpoint:
              row.endpoint,
            statusCode,
            message,
          }
        )

        failures.push({
          id: row.id,
          statusCode:
            statusCode ||
            undefined,
          message,
        })

        /*
         * Subscription expirée :
         * on la supprime.
         */
        if (
          statusCode === 404 ||
          statusCode === 410
        ) {
          const {
            error:
              deleteError,
          } =
            await supabase
              .from(
                'bar_push_subscriptions'
              )
              .delete()
              .eq(
                'id',
                row.id
              )

          if (
            deleteError
          ) {
            console.error(
              'Erreur suppression subscription:',
              deleteError
            )
          } else {
            removed += 1
          }
        }
      }
    }

    /*
     * --------------------------------------------------
     * 9. Résultat
     * --------------------------------------------------
     */

    console.log(
      'Résultat push:',
      {
        requestId:
          record.id,
        subscriptionsFound:
          subscriptions?.length ??
          0,
        sent,
        failed,
        removed,
      }
    )

    return Response.json({
      ok: true,
      requestId:
        record.id,
      requestNumber,
      subscriptionsFound:
        subscriptions?.length ??
        0,
      sent,
      failed,
      removed,
      failures,
    })
  } catch (
    caughtError
  ) {
    console.error(
      'bar-requisition-push:',
      caughtError
    )

    return Response.json(
      {
        ok: false,
        error:
          caughtError instanceof
          Error
            ? caughtError.message
            : String(
                caughtError
              ),
      },
      {
        status: 500,
      }
    )
  }
})