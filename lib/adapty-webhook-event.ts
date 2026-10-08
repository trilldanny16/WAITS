const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type EntitlementEvent = { kind: 'entitlement'; userId: string; profileId: string; eventId: string; isActive: boolean }
type EventResult = EntitlementEvent | { kind: 'verification' | 'ignored' | 'invalid' }
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Parse only authoritative access-level events; cancelling renewal is not expiry. */
export function parseAdaptyEvent(value: unknown, accessLevelId: string): EventResult {
  if (!record(value)) return { kind: 'invalid' }
  if (Object.keys(value).length === 0) return { kind: 'verification' }
  if (value.event_type !== 'access_level_updated') return { kind: 'ignored' }
  const properties = value.event_properties
  if (!record(properties)) return { kind: 'invalid' }
  if (properties.access_level_id !== accessLevelId) return { kind: 'ignored' }
  const { customer_user_id: userId, profile_id: profileId } = value
  const { profile_event_id: eventId, is_active: isActive } = properties
  if (typeof userId !== 'string' || !UUID_PATTERN.test(userId)
    || typeof profileId !== 'string' || !UUID_PATTERN.test(profileId)
    || typeof eventId !== 'string' || !UUID_PATTERN.test(eventId)
    || typeof isActive !== 'boolean') return { kind: 'invalid' }
  return { kind: 'entitlement', userId, profileId, eventId, isActive }
}
