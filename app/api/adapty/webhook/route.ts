import 'server-only'

import { timingSafeEqual } from 'node:crypto'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 1024 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type AdaptyEvent = {
  profile_id?: unknown
  customer_user_id?: unknown
  event_type?: unknown
  event_properties?: {
    access_level_id?: unknown
    is_active?: unknown
    profile_event_id?: unknown
  }
}

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

  let event: AdaptyEvent
  try {
    event = JSON.parse(rawBody.toString('utf8')) as AdaptyEvent
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Adapty verifies a new endpoint with an empty object. It cannot mutate state.
  if (Object.keys(event).length === 0) return Response.json({ verified: true })

  if (!secretMatches(request.headers.get('authorization'), webhookSecret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (event.event_type !== 'access_level_updated') {
    return Response.json({ received: true, ignored: true })
  }

  const properties = event.event_properties
  if (!properties || properties.access_level_id !== accessLevelId) {
    return Response.json({ received: true, ignored: true })
  }

  const userId = event.customer_user_id
  const profileId = event.profile_id
  const eventId = properties.profile_event_id
  const isActive = properties.is_active

  if (
    typeof userId !== 'string'
    || !UUID_PATTERN.test(userId)
    || typeof profileId !== 'string'
    || !UUID_PATTERN.test(profileId)
    || typeof eventId !== 'string'
    || !UUID_PATTERN.test(eventId)
    || typeof isActive !== 'boolean'
  ) {
    return Response.json({ error: 'Invalid entitlement event' }, { status: 422 })
  }

  const { data, error } = await createSupabaseAdmin().rpc('apply_adapty_entitlement', {
    target_user_id: userId,
    target_profile_id: profileId,
    target_access_level_id: accessLevelId,
    target_event_id: eventId,
    target_is_active: isActive,
  })

  if (error) {
    console.error('Adapty entitlement sync failed:', error)
    return Response.json({ error: 'Webhook handler error' }, { status: 500 })
  }

  return Response.json({ received: true, applied: data === true })
}

