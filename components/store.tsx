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
  CURRENT_USER_ID,
  SEED_FOLLOWERS,
  SEED_FOLLOWING,
  SEED_USERS,
  seedMessages,
  seedWorkouts,
} from '@/lib/seed'

export interface Toast {
  id: string
  title: string
  body?: string
}

/** Free-tier limits (Waits Pro removes these) */
export const FREE_MAX_ACTIVE_WORKOUTS = 3
export const FREE_MAX_PARTICIPANTS = 3
export const PRO_MAX_PARTICIPANTS = 6
/** Number of free Pro "passes" before a subscription is required */
export const FREE_PASS_TOTAL = 7
const PREMIUM_STORAGE_KEY = 'waits:premium'
const PASSES_STORAGE_KEY = 'waits:passes'

interface NewWorkoutInput {
  gym: string
  city: string
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
  toasts: Toast[]
  getUser: (id: string) => User
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
  /** free Pro passes remaining (0 when exhausted) */
  passesRemaining: number
  /** true if the user still has any Pro access (paid OR free passes left) */
  hasProAccess: boolean
  /** whether a specific gated item is already unlocked (or user is premium) */
  hasAccess: (key: string) => boolean
  /** consume a free pass to unlock a gated item; false if none remain */
  unlock: (key: string) => boolean
  activeHostedCount: number
  galleryFor: (userId: string) => string[]
  addGalleryPhoto: (src: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

let idCounter = 100
const nextId = (prefix: string) => `${prefix}_${idCounter++}`

export function StoreProvider({ children }: { children: ReactNode }) {
  const [users] = useState<User[]>(SEED_USERS)
  const [workouts, setWorkouts] = useState<Workout[]>(() => seedWorkouts())
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages())
  const [following, setFollowing] = useState<string[]>(SEED_FOLLOWING)
  const [followers] = useState<string[]>(SEED_FOLLOWERS)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isPremium, setIsPremium] = useState(false)
  // Keys of gated items unlocked with free passes (e.g. 'chat:w1', 'gallery:u_mike').
  const [unlockedKeys, setUnlockedKeys] = useState<string[]>([])
  // Extra gallery photos the current user adds this session, keyed by user id.
  const [ownGallery, setOwnGallery] = useState<string[]>([])

  // Hydrate premium status + used passes from localStorage (prototype persistence).
  useEffect(() => {
    try {
      if (localStorage.getItem(PREMIUM_STORAGE_KEY) === '1') setIsPremium(true)
      const raw = localStorage.getItem(PASSES_STORAGE_KEY)
      if (raw) setUnlockedKeys(JSON.parse(raw) as string[])
    } catch {
      /* ignore */
    }
  }, [])

  const passesRemaining = isPremium
    ? FREE_PASS_TOTAL
    : Math.max(0, FREE_PASS_TOTAL - unlockedKeys.length)
  const hasProAccess = isPremium || passesRemaining > 0

  const hasAccess = useCallback(
    (key: string) => isPremium || unlockedKeys.includes(key),
    [isPremium, unlockedKeys],
  )

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
    (id: string) => users.find((u) => u.id === id) ?? users[0],
    [users],
  )

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const toast: Toast = { ...t, id: nextId('t') }
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== toast.id))
    }, 3600)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const unlock = useCallback(
    (key: string): boolean => {
      if (isPremium || unlockedKeys.includes(key)) return true
      if (FREE_PASS_TOTAL - unlockedKeys.length <= 0) return false
      const next = [...unlockedKeys, key]
      setUnlockedKeys(next)
      try {
        localStorage.setItem(PASSES_STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      const left = FREE_PASS_TOTAL - next.length
      pushToast({
        title: 'Free pass used 🎟️',
        body:
          left > 0
            ? `${left} of ${FREE_PASS_TOTAL} free Pro passes left.`
            : 'That was your last free pass — subscribe to keep the perks.',
      })
      return true
    },
    [isPremium, unlockedKeys, pushToast],
  )

  const isFull = useCallback((w: Workout) => w.attendees.length >= w.maxParticipants, [])

  const hasJoined = useCallback(
    (w: Workout) => w.attendees.includes(CURRENT_USER_ID),
    [],
  )

  const joinWorkout = useCallback(
    (id: string) => {
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== id) return w
          if (w.attendees.includes(CURRENT_USER_ID)) return w
          if (w.attendees.length >= w.maxParticipants) return w
          return { ...w, attendees: [...w.attendees, CURRENT_USER_ID] }
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
    [workouts, getUser, pushToast],
  )

  const leaveWorkout = useCallback(
    (id: string) => {
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === id
            ? { ...w, attendees: w.attendees.filter((a) => a !== CURRENT_USER_ID) }
            : w,
        ),
      )
      pushToast({ title: 'You left the workout' })
    },
    [pushToast],
  )

  const activeHostedCount = useMemo(
    () => workouts.filter((w) => w.hostId === CURRENT_USER_ID).length,
    [workouts],
  )

  const createWorkout = useCallback(
    (input: NewWorkoutInput) => {
      // Clamp participant count to the free-tier max unless the user has Pro access.
      const cappedMax = hasProAccess
        ? Math.min(input.maxParticipants, PRO_MAX_PARTICIPANTS)
        : Math.min(input.maxParticipants, FREE_MAX_PARTICIPANTS)
      const workout: Workout = {
        id: nextId('w'),
        hostId: CURRENT_USER_ID,
        attendees: [CURRENT_USER_ID],
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
    [pushToast, hasProAccess],
  )

  const galleryFor = useCallback(
    (userId: string) => {
      const base = (getUser(userId).gallery ?? []).slice()
      if (userId === CURRENT_USER_ID) return [...ownGallery, ...base]
      return base
    },
    [getUser, ownGallery],
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
        userId: CURRENT_USER_ID,
        text: trimmed,
        createdAt: Date.now(),
      },
    ])
  }, [])

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
      currentUserId: CURRENT_USER_ID,
      users,
      workouts,
      messages,
      following,
      followers,
      toasts,
      getUser,
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
      passesRemaining,
      hasProAccess,
      hasAccess,
      unlock,
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
      toasts,
      getUser,
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
      passesRemaining,
      hasProAccess,
      hasAccess,
      unlock,
      activeHostedCount,
      galleryFor,
      addGalleryPhoto,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
