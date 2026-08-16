import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type WebhookPayload = {
  type: 'UPDATE'
  table: string
  schema: string
  record: {
    id: string
    request_number?: string | null
    requested_by?: string | null
    status?: string | null
    stock_applied_at?: string | null
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
    const expectedSecret =
      Deno.env.get('BAR_PUSH_WEBHOOK_SECRET') || ''

    const incomingSecret =
      request.headers.get('x-bar-push-secret') || ''

    if (
      !expectedSecret ||
      incomingSecret !== expectedSecret
    ) {
      return new Response(
        'Unauthorized',
        { status: 401 }
      )
    }

    const payload =
      (await request.json()) as WebhookPayload

    if (
      payload.type !== 'UPDATE' ||
      payload.table !== 'internal_requests'
    ) {
      return Response.json({
        ok: true,
        ignored: true,
      })
    }

    const record = payload.record

    if (!record.stock_applied_at) {
      return Response.json({
        ok: true,
        ignored: true,
        reason: 'not_treated',
      })
    }

    if (!record.requested_by) {
      return Response.json({
        ok: true,
        ignored: true,
        reason: 'no_requester',
      })
    }

    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await supabase
      .from('bar_push_subscriptions')
      .select(
        'id, endpoint, subscription'
      )
      .eq(
        'channel',
        'requisition_nuku'
      )
      .eq(
        'user_id',
        record.requested_by
      )

    if (subscriptionsError) {
      throw subscriptionsError
    }

    const requestNumber =
      record.request_number ||
      record.id

    const isPartial =
      record.status ===
        'partially_approved'

    const title =
      isPartial
        ? 'Réquisition traitée partiellement'
        : 'Réquisition traitée'

    const body =
      isPartial
        ? `${requestNumber} : certains produits n’ont pas pu être fournis.`
        : `${requestNumber} a été traitée par le Bar.`

    const notification =
      JSON.stringify({
        title,
        body,
        requestId:
          record.id,
        requestNumber,
      })

    let sent = 0
    let failed = 0
    let removed = 0

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
        await webpush
          .sendNotification(
            row.subscription,
            notification
          )

        sent += 1
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

        failures.push({
          id: row.id,
          statusCode:
            statusCode ||
            undefined,
          message,
        })

        if (
          statusCode === 404 ||
          statusCode === 410
        ) {
          await supabase
            .from(
              'bar_push_subscriptions'
            )
            .delete()
            .eq(
              'id',
              row.id
            )

          removed += 1
        }
      }
    }

    return Response.json({
      ok: true,
      requestId:
        record.id,
      requestNumber,
      requestedBy:
        record.requested_by,
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
      'requisition-treated-push:',
      caughtError
    )

    return Response.json(
      {
        ok: false,
        error:
          caughtError instanceof Error
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