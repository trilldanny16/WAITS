'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ChatMessage, User, Workout, WorkoutType, Visibility } from '@/lib/types'
import {

  SEED_USERS,
  seedMessages,
  seedWorkouts,
} from '@/lib/seed'
import { supabase } from '@/lib/supabase-client'

export interface Toast {
  id: string
  title: string
  body?: string
}

/** Free-tier limits (Waits Pro removes these) */
export const FREE_MAX_ACTIVE_WORKOUTS = 3
export const FREE_MAX_PARTICIPANTS = 3
const SUPABASE_USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface NewWorkoutInput {
  gym: string
  city: string
  address: string
  lat?: number
  lng?: number
  date: string
  time: string
  types: WorkoutType[]
  notes: string
  maxParticipants: number
  visibility: Visibility
  recurring: 'none' | 'daily' | 'weekly'
}

interface StoreValue {
  currentUserId: string
  users: User[]
  workouts: Workout[]
  messages: ChatMessage[]
  following: string[]
  followers: string[]
  pendingFriendRequestCount: number
  refreshSocialState: () => Promise<void>
  disconnectUser: (userId: string) => Promise<{ ok: boolean; error?: string }>
  toasts: Toast[]
  getUser: (id: string) => User
  updateUser: (id: string, updates: Partial<Pick<User, 'name' | 'bio' | 'homeGym' | 'city' | 'favoriteSplit' | 'avatar'>>) => void
  isFull: (w: Workout) => boolean
  hasJoined: (w: Workout) => boolean
  joinWorkout: (id: string) => Promise<{ ok: boolean; error?: string }>
  leaveWorkout: (id: string) => Promise<{ ok: boolean; error?: string }>
  createWorkout: (input: NewWorkoutInput) => Promise<Workout | null>
  cancelWorkout: (id: string) => Promise<boolean>
  sendMessage: (workoutId: string, text: string) => void
  editMessage: (messageId: string, text: string) => Promise<{ ok: boolean; error?: string }>
  deleteMessage: (messageId: string) => Promise<{ ok: boolean; error?: string }>
  messagesFor: (workoutId: string) => ChatMessage[]
  toggleFollow: (id: string) => void
  isFollowing: (id: string) => boolean
  dismissToast: (id: string) => void
  pushToast: (t: Omit<Toast, 'id'>) => void
  // Premium / subscription
  isPremium: boolean
  setPremium: (v: boolean) => void
  activeHostedCount: number
  galleryFor: (userId: string) => string[]
  addGalleryPhoto: (file: File) => Promise<boolean>
  removeGalleryPhoto: (src: string) => Promise<boolean>
}

const StoreContext = createContext<StoreValue | null>(null)

let idCounter = 100
const nextId = (prefix: string) => `${prefix}_${idCounter++}`

export function StoreProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(SEED_USERS)
  const [currentUserId, setCurrentUserId] = useState('')
  const [authReady, setAuthReady] = useState(false)
  const [workouts, setWorkouts] = useState<Workout[]>(() => seedWorkouts())
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages())
  const [following, setFollowing] = useState<string[]>([])
  const [followers, setFollowers] = useState<string[]>([])
  const [pendingFriendRequestCount, setPendingFriendRequestCount] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [persistedGallery, setPersistedGallery] = useState<Record<string, Array<{ id: string; storagePath: string; url: string; createdAt: string }>>>({})
  const persistedWorkoutIdsRef = useRef<string[]>([])

  useEffect(() => {
  const loadCurrentUser = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setAuthReady(true)
      return
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, display_name, home_gym, city, bio, favorite_split, is_pro, avatar_path')
    const profile = profiles?.find((candidate) => candidate.id === user.id)

    const email = profile?.email ?? user.email ?? ''
    const displayName = profile?.display_name?.trim() || 'WAITS User'

    const toUser = (row: NonNullable<typeof profiles>[number]): User => ({
      id: row.id,
      name: row.display_name?.trim() || 'WAITS User',
      username:
        (row.email ?? '').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') ||
        `user_${row.id.slice(0, 6)}`,
      bio: row.bio ?? '',
      homeGym: row.home_gym ?? 'Add your home gym',
      city: row.city ?? '',
      favoriteSplit: row.favorite_split ?? 'Not set',
      hue: 210,
      isPrivate: false,
      gallery: [],
      isVerifiedPro: row.is_pro === true,
      avatar: row.avatar_path
        ? supabase.storage.from('profile-media').getPublicUrl(row.avatar_path).data.publicUrl
        : undefined,
    })

    const realUser: User = profile
      ? toUser(profile)
      : {
          id: user.id,
          name: displayName,
          username: email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || `user_${user.id.slice(0, 6)}`,
          bio: '', homeGym: 'Add your home gym', city: '', favoriteSplit: 'Not set',
          hue: 210, isPrivate: false, gallery: [], isVerifiedPro: false,
        }
    setCurrentUserId(user.id)
    setIsPremium(profile?.is_pro === true)

    const realUsers = (profiles ?? []).map(toUser)
    setUsers((previous) => [
      realUser,
      ...realUsers.filter((candidate) => candidate.id !== user.id),
      ...previous.filter((existing) => !realUsers.some((candidate) => candidate.id === existing.id) && existing.id !== user.id),
    ])

    setAuthReady(true)
  }

  void loadCurrentUser()
}, [])

  const refreshSocialState = useCallback(async () => {
    if (!currentUserId) return

    const [sentResult, receivedResult] = await Promise.all([
      supabase
        .from('friend_requests')
        .select('sender_id, receiver_id, status')
        .eq('sender_id', currentUserId),
      supabase
        .from('friend_requests')
        .select('sender_id, receiver_id, status')
        .eq('receiver_id', currentUserId),
    ])

    if (sentResult.error || receivedResult.error) {
      console.error(
        'Failed to refresh social state:',
        sentResult.error ?? receivedResult.error,
      )
      return
    }

    const requests = [...(sentResult.data ?? []), ...(receivedResult.data ?? [])]

    const acceptedConnections = Array.from(new Set(
      requests
        .filter((request) => request.status === 'accepted')
        .map((request) => request.sender_id === currentUserId ? request.receiver_id : request.sender_id),
    ))

    // WAITS currently has friendship semantics, not directional follows. An
    // accepted request is therefore represented in both profile lists.
    setFollowing(acceptedConnections)
    setFollowers(acceptedConnections)
    setPendingFriendRequestCount(
      requests.filter(
        (request) => request.receiver_id === currentUserId && request.status === 'pending',
      ).length,
    )
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return

    void refreshSocialState()

    const channel = supabase
      .channel(`friend-requests:${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        () => void refreshSocialState(),
      )
      .subscribe()

    const refreshOnFocus = () => void refreshSocialState()
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') void refreshSocialState()
    }
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisibility)

    return () => {
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnVisibility)
      void supabase.removeChannel(channel)
    }
  }, [currentUserId, refreshSocialState])

  const disconnectUser = useCallback(async (userId: string) => {
    if (!currentUserId || userId === currentUserId) {
      return { ok: false, error: 'That connection cannot be removed.' }
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user || user.id !== currentUserId) {
      return { ok: false, error: 'Your session could not be verified. Please sign in again.' }
    }

    const { data, error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('status', 'accepted')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`,
      )
      .select('id')

    if (error) return { ok: false, error: error.message }
    if (!data || data.length === 0) {
      return { ok: false, error: 'No accepted connection was removed.' }
    }

    await refreshSocialState()
    return { ok: true }
  }, [currentUserId, refreshSocialState])

  const setPremium = useCallback((v: boolean) => {
    setIsPremium(v)
    setUsers((previous) => previous.map((user) =>
      user.id === currentUserId ? { ...user, isVerifiedPro: v } : user,
    ))
  }, [currentUserId])

  const getUser = useCallback(
    (id: string) => users.find((u) => u.id === id) ?? ({
      id, name: 'WAITS User', username: `user_${id.slice(0, 6)}`, bio: '',
      homeGym: 'Gym not set', city: '', favoriteSplit: 'Not set', hue: 210,
      isPrivate: false, gallery: [],
    }),
    [users],
  )

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const toast: Toast = { ...t, id: nextId('t') }
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== toast.id))
    }, 3600)
  }, [])

  useEffect(() => {
    if (!currentUserId) return

    let active = true
    const showAndRead = async (notification: { id: string; message: string }) => {
      if (!active) return
      pushToast({ title: 'Workout invite', body: notification.message })
      await supabase
        .from('workout_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.id)
        .eq('recipient_id', currentUserId)
    }

    void supabase
      .from('workout_notifications')
      .select('id, message')
      .is('read_at', null)
      .order('created_at', { ascending: true })
      .limit(5)
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load workout notifications:', error)
          return
        }
        for (const notification of data ?? []) void showAndRead(notification)
      })

    const channel = supabase
      .channel(`workout-notifications:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workout_notifications',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          const notification = payload.new as { id: string; message: string }
          void showAndRead(notification)
        },
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [currentUserId, pushToast])

  const updateUser = useCallback(
    (id: string, updates: Partial<Pick<User, 'name' | 'bio' | 'homeGym' | 'city' | 'favoriteSplit' | 'avatar'>>) => {
      setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...updates } : user)))
    },
    [],
  )

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const isFull = useCallback((w: Workout) => w.attendees.length >= w.maxParticipants, [])

  const hasJoined = useCallback(
    (w: Workout) => w.attendees.includes(currentUserId),
    [currentUserId],
  )


  const refreshPersistedWorkouts = useCallback(async () => {
    const [workoutResult, attendanceResult] = await Promise.all([
      supabase
        .from('workouts')
        .select('id, host_id, gym, city, address, lat, lng, workout_date, workout_time, workout_types, notes, max_participants, visibility, recurring')
        .order('workout_date', { ascending: true }),
      supabase.from('workout_attendees').select('workout_id, user_id'),
    ])
    if (workoutResult.error || attendanceResult.error) {
      return { ok: false, error: (workoutResult.error ?? attendanceResult.error)?.message }
    }
    const attendanceByWorkout = new Map<string, string[]>()
    for (const row of attendanceResult.data ?? []) {
      const attendees = attendanceByWorkout.get(row.workout_id) ?? []
      attendees.push(row.user_id)
      attendanceByWorkout.set(row.workout_id, attendees)
    }
    const persisted: Workout[] = (workoutResult.data ?? []).map((row) => ({
      id: row.id, hostId: row.host_id, gym: row.gym, city: row.city, address: row.address,
      lat: row.lat ?? undefined, lng: row.lng ?? undefined, date: row.workout_date,
      time: row.workout_time.slice(0, 5), types: row.workout_types as WorkoutType[],
      notes: row.notes ?? '', maxParticipants: row.max_participants,
      visibility: row.visibility as Visibility,
      attendees: Array.from(new Set([row.host_id, ...(attendanceByWorkout.get(row.id) ?? [])])),
      recurring: row.recurring as Workout['recurring'],
    }))
    setWorkouts((previous) => {
      const prototype = previous.filter((workout) => !persistedWorkoutIdsRef.current.includes(workout.id))
      return [...persisted, ...prototype]
    })
    persistedWorkoutIdsRef.current = persisted.map((workout) => workout.id)
    return { ok: true }
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    void refreshPersistedWorkouts()
    const channel = supabase
      .channel('persisted-workouts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts' }, () => {
        void refreshPersistedWorkouts()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [currentUserId, refreshPersistedWorkouts])

  const refreshWorkoutAttendance = useCallback(async () => {
    if (!currentUserId) return { ok: false, error: 'Your session is not ready.' }

    const { data, error } = await supabase
      .from('workout_attendees')
      .select('workout_id, user_id')

    if (error) return { ok: false, error: error.message }

    const nextPersisted = new Map<string, string[]>()
    for (const row of data ?? []) {
      const attendees = nextPersisted.get(row.workout_id) ?? []
      if (!attendees.includes(row.user_id)) attendees.push(row.user_id)
      nextPersisted.set(row.workout_id, attendees)
    }

    setWorkouts((previous) => previous.map((workout) => {
      // Seed identities model the prototype's default crowd. Real Supabase
      // users are rebuilt exclusively from workout_attendees so a deleted join
      // can never survive in local state. A real workout host remains an
      // attendee by definition, even though prototype workouts are local-only.
      const defaultAttendees = workout.attendees.filter(
        (id) => !SUPABASE_USER_ID_PATTERN.test(id) || id === workout.hostId,
      )
      const persisted = nextPersisted.get(workout.id) ?? []
      return { ...workout, attendees: Array.from(new Set([...defaultAttendees, ...persisted])) }
    }))
    return { ok: true }
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return
    void refreshWorkoutAttendance()

    const channel = supabase
      .channel('workout-attendees')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_attendees' },
        () => void refreshWorkoutAttendance(),
      )
      .subscribe()

    const refresh = () => void refreshWorkoutAttendance()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      void supabase.removeChannel(channel)
    }
  }, [currentUserId, refreshWorkoutAttendance])

  const joinWorkout = useCallback(
    async (id: string) => {
      const workout = workouts.find((candidate) => candidate.id === id)
      if (!workout) return { ok: false, error: 'That workout is no longer available.' }
      if (workout.attendees.includes(currentUserId)) return { ok: true }
      if (workout.attendees.length >= workout.maxParticipants) {
        const error = 'That workout is full.'
        pushToast({ title: 'Could not join', body: error })
        return { ok: false, error }
      }

      if (!SUPABASE_USER_ID_PATTERN.test(id)) {
        setWorkouts((previous) => previous.map((candidate) =>
          candidate.id === id
            ? { ...candidate, attendees: Array.from(new Set([...candidate.attendees, currentUserId])) }
            : candidate,
        ))
        const host = getUser(workout.hostId)
        pushToast({
          title: `You’re in for ${workout.types.join(' + ')} 💪`,
          body: `Preview workout joined with ${host.name.split(' ')[0]}.`,
        })
        return { ok: true }
      }

      const { data, error } = await supabase
        .from('workout_attendees')
        .insert({ workout_id: id, user_id: currentUserId })
        .select('workout_id, user_id')
        .single()

      if (error || !data) {
        if (error?.code === '23505') {
          const refreshed = await refreshWorkoutAttendance()
          if (refreshed.ok) return { ok: true }
        }
        const message = error?.message ?? 'Supabase did not confirm the join.'
        pushToast({ title: 'Could not join', body: message })
        return { ok: false, error: message }
      }

      await refreshWorkoutAttendance()
      const host = getUser(workout.hostId)
      pushToast({
        title: `You’re in for ${workout.types.join(' + ')} 💪`,
        body: `Chat with ${host.name.split(' ')[0]} is now open.`,
      })
      return { ok: true }
    },
    [workouts, getUser, pushToast, currentUserId, refreshWorkoutAttendance],
  )

  const leaveWorkout = useCallback(
    async (id: string) => {
      if (!SUPABASE_USER_ID_PATTERN.test(id)) {
        setWorkouts((previous) => previous.map((workout) =>
          workout.id === id
            ? { ...workout, attendees: workout.attendees.filter((attendeeId) => attendeeId !== currentUserId) }
            : workout,
        ))
        pushToast({ title: 'You left the Preview workout' })
        return { ok: true }
      }

      const { data, error } = await supabase
        .from('workout_attendees')
        .delete()
        .eq('workout_id', id)
        .eq('user_id', currentUserId)
        .select('workout_id, user_id')

      if (error) {
        pushToast({ title: 'Could not leave workout', body: error.message })
        return { ok: false, error: error.message }
      }

      if (!data || data.length === 0) {
        await refreshWorkoutAttendance()
        const message = 'No persisted attendance was removed.'
        pushToast({ title: 'Could not confirm leave', body: message })
        return { ok: false, error: message }
      }

      const refreshed = await refreshWorkoutAttendance()
      if (!refreshed.ok) {
        pushToast({ title: 'Could not confirm the change', body: refreshed.error })
        return refreshed
      }
      pushToast({ title: 'You left the workout' })
      return { ok: true }
    },
    [pushToast, currentUserId, refreshWorkoutAttendance],
  )

  const activeHostedCount = useMemo(
    () => workouts.filter((w) => w.hostId === currentUserId).length,
    [workouts, currentUserId],
  )

  const createWorkout = useCallback(
    async (input: NewWorkoutInput) => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      const authenticatedHostId = session?.user.id
      if (sessionError || !authenticatedHostId) {
        pushToast({
          title: 'Workout was not posted',
          body: sessionError?.message ?? 'Your authenticated session could not be verified.',
        })
        return null
      }

      const cappedMax = isPremium ? input.maxParticipants : Math.min(input.maxParticipants, FREE_MAX_PARTICIPANTS)
      const { data, error } = await supabase.from('workouts').insert({
        host_id: authenticatedHostId, gym: input.gym, city: input.city, address: input.address,
        lat: input.lat ?? null, lng: input.lng ?? null, workout_date: input.date,
        workout_time: input.time, workout_types: input.types, notes: input.notes,
        max_participants: cappedMax, visibility: input.visibility, recurring: input.recurring,
      }).select('id').single()
      if (error || !data) {
        pushToast({ title: 'Workout was not posted', body: error?.message ?? 'Supabase did not confirm the workout.' })
        return null
      }
      const workout: Workout = {
        id: data.id,
        hostId: authenticatedHostId,
        attendees: [authenticatedHostId],
        ...input,
        maxParticipants: cappedMax,
      }
      await refreshPersistedWorkouts()
      pushToast({ title: 'Workout posted 🔥', body: 'Your followers were notified. Come Thru?' })
      return workout
    },
    [pushToast, isPremium, refreshPersistedWorkouts],
  )

  const refreshGallery = useCallback(async () => {
    if (!currentUserId || !isPremium) {
      setPersistedGallery({})
      return { ok: true }
    }

    const { data, error } = await supabase
      .from('profile_photos')
      .select('id, user_id, storage_path, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load persisted gallery photos:', error)
      return { ok: false, error: error.message }
    }

    const resolved = await Promise.all((data ?? []).map(async (photo) => {
      const signed = await supabase.storage
        .from('profile-gallery')
        .createSignedUrl(photo.storage_path, 60 * 60)

      if (signed.error || !signed.data?.signedUrl) {
        console.error('Failed to resolve persisted gallery photo:', signed.error)
        return null
      }

      return {
        id: photo.id,
        userId: photo.user_id,
        storagePath: photo.storage_path,
        createdAt: photo.created_at,
        url: signed.data.signedUrl,
      }
    }))

    const next: Record<string, Array<{ id: string; storagePath: string; url: string; createdAt: string }>> = {}
    for (const photo of resolved) {
      if (!photo) continue
      next[photo.userId] = [...(next[photo.userId] ?? []), {
        id: photo.id,
        storagePath: photo.storagePath,
        url: photo.url,
        createdAt: photo.createdAt,
      }]
    }
    setPersistedGallery(next)
    return { ok: true }
  }, [currentUserId, isPremium])

  useEffect(() => {
    void refreshGallery()
  }, [refreshGallery])

  const galleryFor = useCallback(
    (userId: string) => (persistedGallery[userId] ?? []).map((photo) => photo.url),
    [persistedGallery],
  )

  const addGalleryPhoto = useCallback(async (file: File) => {
    if (!currentUserId || !isPremium) {
      pushToast({ title: 'WAITS Pro required', body: 'Upgrade to post Gym Gallery photos.' })
      return false
    }

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    if (!allowedTypes.has(file.type)) {
      pushToast({ title: 'Photo was not added', body: 'Choose a JPG, PNG, WebP, or GIF image.' })
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      pushToast({ title: 'Photo was not added', body: 'Gallery photos must be 10 MB or smaller.' })
      return false
    }

    const extensionByType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const path = `${currentUserId}/gallery-${crypto.randomUUID()}.${extensionByType[file.type]}`
    const upload = await supabase.storage.from('profile-gallery').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    if (upload.error) {
      console.error('Failed to upload gallery photo:', upload.error)
      pushToast({ title: 'Photo was not added', body: upload.error.message })
      return false
    }

    const saved = await supabase
      .from('profile_photos')
      .insert({ user_id: currentUserId, storage_path: path })
      .select('id')
      .single()
    if (saved.error) {
      await supabase.storage.from('profile-gallery').remove([path])
      console.error('Failed to save gallery photo metadata:', saved.error)
      pushToast({ title: 'Photo was not added', body: saved.error.message })
      return false
    }

    const refreshed = await refreshGallery()
    if (!refreshed.ok) {
      pushToast({ title: 'Photo saved', body: 'Refresh to load it in your gallery.' })
      return true
    }
    pushToast({ title: 'Photo added to your gallery' })
    return true
  }, [currentUserId, isPremium, pushToast, refreshGallery])

  const removeGalleryPhoto = useCallback(async (src: string) => {
    if (!currentUserId || !isPremium) {
      pushToast({ title: 'Photo was not removed', body: 'WAITS Pro is required to manage Gallery photos.' })
      return false
    }

    const photo = (persistedGallery[currentUserId] ?? []).find((candidate) => candidate.url === src)
    if (!photo) {
      pushToast({ title: 'Photo was not removed', body: 'The stored photo could not be found.' })
      return false
    }

    const removedMetadata = await supabase
      .from('profile_photos')
      .delete()
      .eq('id', photo.id)
      .eq('user_id', currentUserId)
      .select('id')
    if (removedMetadata.error || !removedMetadata.data?.length) {
      const message = removedMetadata.error?.message ?? 'Supabase did not confirm the deletion.'
      console.error('Failed to delete gallery photo metadata:', removedMetadata.error)
      pushToast({ title: 'Photo was not removed', body: message })
      return false
    }

    const removedFile = await supabase.storage.from('profile-gallery').remove([photo.storagePath])
    if (removedFile.error) {
      const restored = await supabase.from('profile_photos').insert({
        id: photo.id,
        user_id: currentUserId,
        storage_path: photo.storagePath,
        created_at: photo.createdAt,
      })
      console.error('Failed to delete gallery photo file:', removedFile.error)
      if (restored.error) console.error('Failed to restore gallery photo metadata:', restored.error)
      pushToast({ title: 'Photo was not removed', body: removedFile.error.message })
      return false
    }

    const refreshed = await refreshGallery()
    if (!refreshed.ok) {
      pushToast({ title: 'Photo removed', body: 'Refresh to update your gallery.' })
      return true
    }
    pushToast({ title: 'Photo removed' })
    return true
  }, [currentUserId, isPremium, persistedGallery, pushToast, refreshGallery])

  const cancelWorkout = useCallback(
    async (id: string) => {
      const { data, error } = await supabase.from('workouts').delete().eq('id', id).eq('host_id', currentUserId).select('id')
      if (error || !data || data.length === 0) {
        pushToast({ title: 'Workout was not canceled', body: error?.message ?? 'No hosted workout was removed.' })
        return false
      }
      await refreshPersistedWorkouts()
      setMessages((prev) => prev.filter((message) => message.workoutId !== id))
      pushToast({ title: 'Workout canceled', body: 'Attendees were notified.' })
      return true
    },
    [pushToast, currentUserId, refreshPersistedWorkouts],
  )

  const sendMessage = useCallback((workoutId: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((prev) => [
      ...prev,
      {
        id: nextId('m'),
        workoutId,
        userId: currentUserId,
        text: trimmed,
        createdAt: Date.now(),
      },
    ])
  }, [currentUserId])

  const editMessage = useCallback(async (messageId: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return { ok: false, error: 'Message cannot be empty.' }

    const message = messages.find((candidate) => candidate.id === messageId)
    if (!message) return { ok: false, error: 'That message is no longer available.' }
    if (message.userId !== currentUserId) {
      return { ok: false, error: 'You can edit only your own messages.' }
    }

    setMessages((previous) =>
      previous.map((candidate) =>
        candidate.id === messageId ? { ...candidate, text: trimmed } : candidate,
      ),
    )
    return { ok: true }
  }, [currentUserId, messages])

  const deleteMessage = useCallback(async (messageId: string) => {
    const message = messages.find((candidate) => candidate.id === messageId)
    if (!message) return { ok: false, error: 'That message is no longer available.' }
    if (message.userId !== currentUserId) {
      return { ok: false, error: 'You can delete only your own messages.' }
    }

    setMessages((previous) => previous.filter((candidate) => candidate.id !== messageId))
    return { ok: true }
  }, [currentUserId, messages])

  const messagesFor = useCallback(
    (workoutId: string) =>
      messages
        .filter((m) => m.workoutId === workoutId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [messages],
  )

  const isFollowing = useCallback((id: string) => following.includes(id), [following])

  const toggleFollow = useCallback(
    (id: string) => {
      setFollowing((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      )
    },
    [],
  )

  const value = useMemo<StoreValue>(
    () => ({
      currentUserId,
      users,
      workouts,
      messages,
      following,
      followers,
      pendingFriendRequestCount,
      refreshSocialState,
      disconnectUser,
      toasts,
      getUser,
      updateUser,
      isFull,
      hasJoined,
      joinWorkout,
      leaveWorkout,
      createWorkout,
      cancelWorkout,
      sendMessage,
      editMessage,
      deleteMessage,
      messagesFor,
      toggleFollow,
      isFollowing,
      dismissToast,
      pushToast,
      isPremium,
      setPremium,
      activeHostedCount,
      galleryFor,
      addGalleryPhoto,
      removeGalleryPhoto,
    }),
    [
      users,
      workouts,
      messages,
      following,
      followers,
      pendingFriendRequestCount,
      refreshSocialState,
      disconnectUser,
      toasts,
      getUser,
      updateUser,
      isFull,
      hasJoined,
      joinWorkout,
      leaveWorkout,
      createWorkout,
      cancelWorkout,
      sendMessage,
      editMessage,
      deleteMessage,
      messagesFor,
      toggleFollow,
      isFollowing,
      dismissToast,
      pushToast,
      isPremium,
      setPremium,
      activeHostedCount,
      galleryFor,
      addGalleryPhoto,
      removeGalleryPhoto,
    ],
  )

  if (!authReady || !currentUserId) return null

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
