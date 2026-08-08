'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
export const PRO_MAX_PARTICIPANTS = 6
const PREMIUM_STORAGE_KEY = 'waits:premium'

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
  toasts: Toast[]
  getUser: (id: string) => User
  updateUser: (id: string, updates: Partial<Pick<User, 'name' | 'bio' | 'homeGym' | 'city'>>) => void
  isFull: (w: Workout) => boolean
  hasJoined: (w: Workout) => boolean
  joinWorkout: (id: string) => void
  leaveWorkout: (id: string) => void
  createWorkout: (input: NewWorkoutInput) => Workout
  cancelWorkout: (id: string) => void
  sendMessage: (workoutId: string, text: string) => void
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
  addGalleryPhoto: (src: string) => void
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
  // Extra gallery photos the current user adds this session, keyed by user id.
  const [ownGallery, setOwnGallery] = useState<string[]>([])

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
      .select('id, email, display_name, home_gym, city, bio')
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
      favoriteSplit: 'Not set',
      hue: 210,
      isPrivate: false,
      gallery: [],
    })

    const realUser: User = profile
      ? toUser(profile)
      : {
          id: user.id,
          name: displayName,
          username: email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || `user_${user.id.slice(0, 6)}`,
          bio: '', homeGym: 'Add your home gym', city: '', favoriteSplit: 'Not set',
          hue: 210, isPrivate: false, gallery: [],
        }
    setCurrentUserId(user.id)

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

    const { data, error } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id, status')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)

    if (error) {
      console.error('Failed to refresh social state:', error)
      return
    }

    const acceptedConnections = Array.from(new Set(
      (data ?? [])
        .filter((request) => request.status === 'accepted')
        .map((request) => request.sender_id === currentUserId ? request.receiver_id : request.sender_id),
    ))

    // WAITS currently has friendship semantics, not directional follows. An
    // accepted request is therefore represented in both profile lists.
    setFollowing(acceptedConnections)
    setFollowers(acceptedConnections)
    setPendingFriendRequestCount(
      (data ?? []).filter(
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

  // Hydrate premium status from localStorage (prototype persistence).
  useEffect(() => {
    try {
      if (localStorage.getItem(PREMIUM_STORAGE_KEY) === '1') setIsPremium(true)
    } catch {
      /* ignore */
    }
  }, [])

  const setPremium = useCallback((v: boolean) => {
    setIsPremium(v)
    try {
      if (v) localStorage.setItem(PREMIUM_STORAGE_KEY, '1')
      else localStorage.removeItem(PREMIUM_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

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

  const updateUser = useCallback(
    (id: string, updates: Partial<Pick<User, 'name' | 'bio' | 'homeGym' | 'city'>>) => {
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

  const joinWorkout = useCallback(
    (id: string) => {
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== id) return w
          if (w.attendees.includes(currentUserId)) return w
          if (w.attendees.length >= w.maxParticipants) return w
          return { ...w, attendees: [...w.attendees, currentUserId] }
        }),
      )
      const w = workouts.find((x) => x.id === id)
      if (w) {
        const host = getUser(w.hostId)
        pushToast({
          title: `You’re in for ${w.types.join(' + ')} 💪`,
          body: `Chat with ${host.name.split(' ')[0]} is now open.`,
        })
      }
    },
    [workouts, getUser, pushToast, currentUserId],
  )

  const leaveWorkout = useCallback(
    (id: string) => {
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === id
            ? { ...w, attendees: w.attendees.filter((a) => a !== currentUserId) }
            : w,
        ),
      )
      pushToast({ title: 'You left the workout' })
    },
    [pushToast, currentUserId],
  )

  const activeHostedCount = useMemo(
    () => workouts.filter((w) => w.hostId === currentUserId).length,
    [workouts, currentUserId],
  )

  const createWorkout = useCallback(
    (input: NewWorkoutInput) => {
      // Clamp participant count to the free-tier max unless premium.
      const cappedMax = isPremium
        ? Math.min(input.maxParticipants, PRO_MAX_PARTICIPANTS)
        : Math.min(input.maxParticipants, FREE_MAX_PARTICIPANTS)
      const workout: Workout = {
        id: nextId('w'),
        hostId: currentUserId,
        attendees: [currentUserId],
        ...input,
        maxParticipants: cappedMax,
      }
      setWorkouts((prev) => [workout, ...prev])
      pushToast({
        title: 'Workout posted 🔥',
        body: 'Your followers were notified. Come Thru?',
      })
      return workout
    },
    [pushToast, isPremium, currentUserId],
  )

  const galleryFor = useCallback(
    (userId: string) => {
      const base = (getUser(userId).gallery ?? []).slice()
      if (userId === currentUserId) return [...ownGallery, ...base]
      return base
    },
    [getUser, ownGallery, currentUserId],
  )

  const addGalleryPhoto = useCallback(
    (src: string) => {
      setOwnGallery((prev) => [src, ...prev])
      pushToast({ title: 'Photo added to your gallery 📸' })
    },
    [pushToast],
  )

  const cancelWorkout = useCallback(
    (id: string) => {
      setWorkouts((prev) => prev.filter((w) => w.id !== id))
      setMessages((prev) => prev.filter((m) => m.workoutId !== id))
      pushToast({ title: 'Workout canceled', body: 'Attendees were notified.' })
    },
    [pushToast],
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
    }),
    [
      users,
      workouts,
      messages,
      following,
      followers,
      pendingFriendRequestCount,
      refreshSocialState,
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
