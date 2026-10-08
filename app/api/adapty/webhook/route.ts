import 'server-only'

import { timingSafeEqual } from 'node:crypto'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { parseAdaptyEvent } from '@/lib/adapty-webhook-event'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 1024 * 1024

function secretMatches(received: string | null, expected: string) {
  if (!received) return false
  const receivedBytes = Buffer.from(received)
  const expectedBytes = Buffer.from(expected)
  return receivedBytes.length === expectedBytes.length
    && timingSafeEqual(receivedBytes, expectedBytes)
}

export async function POST(request: Request) {
  const webhookSecret = process.env.ADAPTY_WEBHOOK_SECRET
  const accessLevelId = process.env.ADAPTY_ACCESS_LEVEL_ID
  if (!webhookSecret || !accessLevelId) {
    return Response.json({ error: 'Adapty webhook is not configured' }, { status: 503 })
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES) {
    return Response.json({ error: 'Payload too large' }, { status: 413 })
  }

  const rawBody = Buffer.from(await request.arrayBuffer())
  if (rawBody.byteLength > MAX_BODY_BYTES) {
    return Response.json({ error: 'Payload too large' }, { status: 413 })
  }

  let event: unknown
  try {
    event = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Adapty verifies a new endpoint with an empty object. It cannot mutate state.
  const parsed = parseAdaptyEvent(event, accessLevelId)
  if (parsed.kind === 'verification') return Response.json({ verified: true })

  if (!secretMatches(request.headers.get('authorization'), webhookSecret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (parsed.kind === 'ignored') {
    return Response.json({ received: true, ignored: true })
  }

  if (parsed.kind !== 'entitlement') {
    return Response.json({ error: 'Invalid entitlement event' }, { status: 422 })
  }

  const { data, error } = await createSupabaseAdmin().rpc('apply_adapty_entitlement', {
    target_user_id: parsed.userId,
    target_profile_id: parsed.profileId,
    target_access_level_id: accessLevelId,
    target_event_id: parsed.eventId,
    target_is_active: parsed.isActive,
  })

  if (error) {
    console.error('Adapty entitlement sync failed:', error)
    return Response.json({ error: 'Webhook handler error' }, { status: 500 })
  }

  return Response.json({ received: true, applied: data === true })
}

