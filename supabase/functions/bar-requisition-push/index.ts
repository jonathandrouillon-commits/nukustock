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
  Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

Deno.serve(async (request) => {
  try {
    const expectedSecret =
      Deno.env.get('BAR_PUSH_WEBHOOK_SECRET')!

    const incomingSecret =
      request.headers.get('x-bar-push-secret')

    if (
      !expectedSecret ||
      incomingSecret !== expectedSecret
    ) {
      return new Response('Unauthorized', {
        status: 401,
      })
    }

    const payload =
      (await request.json()) as WebhookPayload

    if (
      payload.type !== 'INSERT' ||
      payload.table !== 'internal_requests'
    ) {
      return Response.json({
        ok: true,
        ignored: true,
      })
    }

    const record = payload.record

    let departmentName = 'Service'
    let destinationName = ''

    if (record.department_id) {
      const { data } = await supabase
        .from('departments')
        .select('name')
        .eq('id', record.department_id)
        .maybeSingle()

      if (data?.name) {
        departmentName = data.name
      }
    }

    if (record.destination_location_id) {
      const { data } = await supabase
        .from('storage_locations')
        .select('name')
        .eq(
          'id',
          record.destination_location_id
        )
        .maybeSingle()

      if (data?.name) {
        destinationName = data.name
      }
    }

    const { count: lineCount } =
      await supabase
        .from('internal_request_lines')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('request_id', record.id)

    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await supabase
      .from('bar_push_subscriptions')
      .select('id, endpoint, subscription')
      .eq('channel', 'bar_nuku')

    if (subscriptionsError) {
      throw subscriptionsError
    }

    const requestNumber =
      record.request_number || record.id

    const body = [
      `${requestNumber} · ${departmentName}`,
      destinationName
        ? `Destination : ${destinationName}`
        : '',
      typeof lineCount === 'number'
        ? `${lineCount} produit${lineCount > 1 ? 's' : ''}`
        : '',
    ]
      .filter(Boolean)
      .join(' · ')

    const notification =
      JSON.stringify({
        title:
          'Nouvelle réquisition Bar Nuku',
        body,
        requestId: record.id,
        requestNumber,
      })

    let sent = 0
    let removed = 0

    for (const row of subscriptions || []) {
      try {
        await webpush.sendNotification(
          row.subscription,
          notification
        )

        sent += 1
      } catch (error: any) {
        const statusCode =
          Number(
            error?.statusCode ||
              error?.status
          )

        if (
          statusCode === 404 ||
          statusCode === 410
        ) {
          await supabase
            .from('bar_push_subscriptions')
            .delete()
            .eq('id', row.id)

          removed += 1
          continue
        }

        console.error(
          'Push failed:',
          row.endpoint,
          error
        )
      }
    }

    return Response.json({
      ok: true,
      requestId: record.id,
      sent,
      removed,
    })
  } catch (caughtError) {
    console.error(
      'bar-requisition-push:',
      caughtError
    )

    return Response.json(
      {
        ok: false,
        error:
          caughtError instanceof Error
            ? caughtError.message
            : String(caughtError),
      },
      { status: 500 }
    )
  }
})