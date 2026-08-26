import { supabase } from '@/lib/supabase'

export type WorkoutVisibility = 'friends' | 'public'
export type WorkoutRecurrence = 'none' | 'daily' | 'weekly'

export interface WorkoutFeedItem {
  id: string
  host: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  gym: string
  city: string
  address: string
  latitude: number | null
  longitude: number | null
  date: string
  time: string
  workoutTypes: string[]
  notes: string
  maxParticipants: number
  attendeeCount: number
  spotsRemaining: number
  visibility: WorkoutVisibility
  recurring: WorkoutRecurrence
  isJoined: boolean
  isHostedByViewer: boolean
}

interface WorkoutRow {
  id: string
  host_id: string
  gym: string
  city: string
  address: string
  lat: number | null
  lng: number | null
  workout_date: string
  workout_time: string
  workout_types: string[]
  notes: string
  max_participants: number
  visibility: WorkoutVisibility
  recurring: WorkoutRecurrence
}

interface ProfileRow {
  id: string
  display_name: string | null
  avatar_path: string | null
}

interface AttendanceRow {
  workout_id: string
  user_id: string
}

const FEED_LIMIT = 100

function localIsoDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function avatarUrl(path: string | null) {
  if (!path) return null
  return supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl
}

function normalizedTime(value: string) {
  return value.length >= 5 ? value.slice(0, 5) : value
}

/**
 * Loads only rows the signed-in user's Supabase session is allowed to read.
 * Visibility and account isolation remain enforced by database RLS; this client
 * never uses or accepts a service-role credential.
 */
export async function fetchWorkoutFeed(viewerId: string): Promise<WorkoutFeedItem[]> {
  const { data: workoutData, error: workoutError } = await supabase
    .from('workouts')
    .select(
      'id, host_id, gym, city, address, lat, lng, workout_date, workout_time, workout_types, notes, max_participants, visibility, recurring',
    )
    .gte('workout_date', localIsoDate())
    .order('workout_date', { ascending: true })
    .order('workout_time', { ascending: true })
    .limit(FEED_LIMIT)

  if (workoutError) throw new Error(workoutError.message)

  const workouts = (workoutData ?? []) as WorkoutRow[]
  if (workouts.length === 0) return []

  const workoutIds = workouts.map((row) => row.id)
  const hostIds = [...new Set(workouts.map((row) => row.host_id))]

  const [profileResult, attendanceResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, avatar_path')
      .in('id', hostIds),
    supabase
      .from('workout_attendees')
      .select('workout_id, user_id')
      .in('workout_id', workoutIds),
  ])

  if (profileResult.error) throw new Error(profileResult.error.message)
  if (attendanceResult.error) throw new Error(attendanceResult.error.message)

  const profiles = new Map(
    ((profileResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  )
  const attendees = new Map<string, Set<string>>()

  for (const row of (attendanceResult.data ?? []) as AttendanceRow[]) {
    const workoutAttendees = attendees.get(row.workout_id) ?? new Set<string>()
    workoutAttendees.add(row.user_id)
    attendees.set(row.workout_id, workoutAttendees)
  }

  return workouts.map((row) => {
    const profile = profiles.get(row.host_id)
    const workoutAttendees = attendees.get(row.id) ?? new Set<string>()
    // The host is always represented in the feed count, even if the attendance
    // table stores only guests.
    workoutAttendees.add(row.host_id)
    const attendeeCount = workoutAttendees.size

    return {
      id: row.id,
      host: {
        id: row.host_id,
        displayName: profile?.display_name?.trim() || 'WAITS member',
        avatarUrl: avatarUrl(profile?.avatar_path ?? null),
      },
      gym: row.gym,
      city: row.city,
      address: row.address,
      latitude: row.lat,
      longitude: row.lng,
      date: row.workout_date,
      time: normalizedTime(row.workout_time),
      workoutTypes: Array.isArray(row.workout_types) ? row.workout_types : [],
      notes: row.notes ?? '',
      maxParticipants: row.max_participants,
      attendeeCount,
      spotsRemaining: Math.max(0, row.max_participants - attendeeCount),
      visibility: row.visibility,
      recurring: row.recurring,
      isJoined: workoutAttendees.has(viewerId),
      isHostedByViewer: row.host_id === viewerId,
    }
  })
}

