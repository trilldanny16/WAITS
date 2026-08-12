'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search as SearchIcon, X } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { WorkoutCard } from '../workout-card'
import { Avatar } from '../avatar'
import { WORKOUT_TYPES, type WorkoutType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase-client'
import {
  getFriendRequestStates,
  cancelFriendRequest,
  sendFriendRequest as persistFriendRequest,
  type FriendRequestState,
} from '@/lib/friend-requests'
type Filter = 'all' | WorkoutType

export function Search() {
  const { workouts, users, getUser, currentUserId, pushToast } = useStore()
  const { openUser } = useNav()
  const [query, setQuery] = useState('')
  const [requestStates, setRequestStates] = useState<Record<string, FriendRequestState>>({})
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [realUsers, setRealUsers] = useState<
  {
    id: string
    email: string | null
    display_name: string | null
  }[]
>([])
const loadUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name')

    if (error) {
      console.error('Failed to load users:', error)
      return
    }

    setRealUsers((data ?? []).filter((profile) => profile.id !== currentUserId))

    const result = await getFriendRequestStates(currentUserId)
    if (result.error) setRequestError(result.error)
    else setRequestStates(result.states)
}, [currentUserId])

useEffect(() => {
  void loadUsers()
  const channel = supabase.channel(`search-relationships:${currentUserId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => void loadUsers())
    .subscribe()
  const refresh = () => void loadUsers()
  window.addEventListener('focus', refresh)
  document.addEventListener('visibilitychange', refresh)
  return () => {
    window.removeEventListener('focus', refresh)
    document.removeEventListener('visibilitychange', refresh)
    void supabase.removeChannel(channel)
  }
}, [currentUserId, loadUsers])
const sendFriendRequest = async (receiverId: string) => {
  if (sendingTo || (requestStates[receiverId] ?? 'none') !== 'none') return

  setSendingTo(receiverId)
  setRequestError(null)

  const result = await persistFriendRequest(currentUserId, receiverId)
  if (!result.ok) {
    setRequestError(result.error ?? 'The friend request could not be sent.')
    setSendingTo(null)
    return
  }

  setRequestStates((prev) => ({ ...prev, [receiverId]: result.state }))
  pushToast({
    title: result.created ? 'Friend request sent' : 'Request already active',
    body: result.created ? 'They will see it in Chats.' : undefined,
  })
  setSendingTo(null)
}

const cancelOutgoingRequest = async (receiverId: string) => {
  if (sendingTo) return
  setSendingTo(receiverId)
  setRequestError(null)

  const result = await cancelFriendRequest(currentUserId, receiverId)
  if (!result.ok) {
    setRequestError(result.error ?? 'The follow request could not be canceled.')
    setSendingTo(null)
    return
  }

  setRequestStates((prev) => ({ ...prev, [receiverId]: 'none' }))
  pushToast({ title: 'Follow request canceled' })
  setSendingTo(null)
}


const q = query.trim().toLowerCase()

const realMatchedUsers = useMemo(() => {
  if (!q) return []

  return realUsers.filter((user) => {
    const name = user.display_name?.toLowerCase() ?? ''
    const email = user.email?.toLowerCase() ?? ''

    return (
      user.id !== currentUserId &&
      (name.includes(q) || email.includes(q))
    )
  })
}, [q, realUsers, currentUserId])

  const matchedUsers = useMemo(() => {
    if (!q) return []
    return users.filter(
      (u) =>
        u.id !== currentUserId &&
        (u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.homeGym.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q)),
    )
  }, [q, users, currentUserId])

  const matchedWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      if (filter !== 'all' && !w.types.includes(filter)) return false
      if (!q) return true
      const host = getUser(w.hostId)
      return (
        w.gym.toLowerCase().includes(q) ||
        w.city.toLowerCase().includes(q) ||
        w.types.some((t) => t.toLowerCase().includes(q)) ||
        host.name.toLowerCase().includes(q) ||
        host.username.toLowerCase().includes(q)
      )
    })
  }, [workouts, filter, q, getUser])

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-foreground">Discover</h1>
        <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
          <SearchIcon size={18} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gym, friend, workout, or city"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={18} className="text-muted-foreground" />
            </button>
          ) : null}
        </div>

        {/* Type filters */}
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {(['all', ...WORKOUT_TYPES] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-card-foreground ring-1 ring-border',
              )}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        {requestError ? (
          <p role="alert" className="mb-3 rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {requestError}
          </p>
        ) : null}
        {realMatchedUsers.length > 0 ? (
          <section className="mb-5">
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              People
            </h2>
            <div className="space-y-2">
              {realMatchedUsers.map((u) => (
<div
  key={u.id}
  className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-border"
>
  <button
    type="button"
    onClick={() => openUser(u.id)}
    className="flex min-w-0 flex-1 items-center gap-3 text-left"
  >
    <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {(u.display_name || u.email || '?').charAt(0).toUpperCase()}
    </div>

    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-card-foreground">
        {u.display_name || 'WAITS User'}
      </p>

      <p className="truncate text-xs text-muted-foreground">
        {u.email}
      </p>
    </div>
  </button>

  <button
    type="button"
    disabled={
      sendingTo === u.id ||
      requestStates[u.id] === 'accepted' ||
      requestStates[u.id] === 'pending_incoming'
    }
    onClick={() => requestStates[u.id] === 'pending_outgoing'
      ? cancelOutgoingRequest(u.id)
      : sendFriendRequest(u.id)}
    className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
  >
    {sendingTo === u.id
      ? requestStates[u.id] === 'pending_outgoing' ? 'Canceling...' : 'Sending...'
      : requestStates[u.id] === 'accepted'
        ? 'Connected'
        : requestStates[u.id] === 'pending_incoming'
          ? 'Request received'
          : requestStates[u.id] === 'pending_outgoing'
            ? 'Cancel Request'
            : 'Follow'}
  </button>
</div>
              ))}
            </div>
          </section>
        ) : null}

        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {matchedWorkouts.length} Workout{matchedWorkouts.length === 1 ? '' : 's'}
        </h2>
        {matchedWorkouts.length === 0 ? (
          <p className="pt-6 text-center text-sm text-muted-foreground">
            No workouts match your search.
          </p>
        ) : (
          <div className="space-y-3">
            {matchedWorkouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

