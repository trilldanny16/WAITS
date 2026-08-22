'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search as SearchIcon, X } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { WorkoutCard } from '../workout-card'
import { Avatar } from '../avatar'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase-client'
import {
  getFriendRequestStates,
  cancelFriendRequest,
  sendFriendRequest as persistFriendRequest,
  type FriendRequestState,
} from '@/lib/friend-requests'
type SearchMode = 'friends' | 'workouts'

export function Search() {
  const { workouts, users, getUser, currentUserId, pushToast } = useStore()
  const { openUser } = useNav()
  const [query, setQuery] = useState('')
  const [requestStates, setRequestStates] = useState<Record<string, FriendRequestState>>({})
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [mode, setMode] = useState<SearchMode>('friends')
  const [realUsers, setRealUsers] = useState<
  {
    id: string
    display_name: string | null
  }[]
>([])
useEffect(() => {
  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name')

    if (error) {
      console.error('Failed to load users:', error)
      return
    }

    setRealUsers((data ?? []).filter((profile) => profile.id !== currentUserId))

    const result = await getFriendRequestStates(currentUserId)
    if (result.error) setRequestError(result.error)
    else setRequestStates(result.states)
  }

  loadUsers()
}, [currentUserId])
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
  return realUsers.filter((user) => {
    const name = user.display_name?.toLowerCase() ?? ''
    return user.id !== currentUserId && (!q || name.includes(q))
  })
}, [q, realUsers, currentUserId])

  const realUserNames = useMemo(
    () => new Set(realUsers.map((user) => user.display_name?.trim().toLowerCase()).filter(Boolean)),
    [realUsers],
  )

  const matchedUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.id !== currentUserId &&
        !realUserNames.has(u.name.trim().toLowerCase()) &&
        (!q ||
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.favoriteSplit.toLowerCase().includes(q)),
    )
  }, [q, users, currentUserId, realUserNames])

  const matchedWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      if (!q) return true
      const host = getUser(w.hostId)
      return (
        w.types.some((type) => type.toLowerCase().includes(q)) ||
        w.gym.toLowerCase().includes(q) ||
        w.city.toLowerCase().includes(q) ||
        w.address.toLowerCase().includes(q) ||
        host.name.toLowerCase().includes(q) ||
        host.username.toLowerCase().includes(q)
      )
    })
  }, [workouts, q, getUser])

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-foreground">Social Search</h1>
        <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
          <SearchIcon size={18} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'friends' ? 'Search for People' : 'Search workouts or gyms'}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={18} className="text-muted-foreground" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 rounded-2xl bg-card p-1 ring-1 ring-border">
          {(['friends', 'workouts'] as SearchMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option)
                setQuery('')
              }}
              className={cn(
                'rounded-xl px-4 py-2.5 text-sm font-bold capitalize transition-colors',
                mode === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {option === 'friends' ? 'Friends' : 'Workouts'}
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
        {mode === 'friends' ? (
          <section className="mb-5">
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {q ? 'People' : 'Suggested people'}
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
      {(u.display_name || '?').charAt(0).toUpperCase()}
    </div>

    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-card-foreground">
        {u.display_name || 'WAITS User'}
      </p>

      <p className="truncate text-xs text-muted-foreground">WAITS member</p>
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
              {matchedUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => openUser(u.id)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-border"
                >
                  <Avatar user={u} size={42} ring />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-card-foreground">{u.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">@{u.username}</span>
                  </span>
                  <span className="rounded-xl bg-lime px-3 py-2 text-xs font-bold text-black">View</span>
                </button>
              ))}
              {realMatchedUsers.length === 0 && matchedUsers.length === 0 ? (
                <p className="pt-6 text-center text-sm text-muted-foreground">No people match your search.</p>
              ) : null}
            </div>
          </section>
        ) : (
          <section>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {q ? `${matchedWorkouts.length} matching workout${matchedWorkouts.length === 1 ? '' : 's'}` : 'Suggested workouts'}
            </h2>
            {matchedWorkouts.length === 0 ? (
              <p className="pt-6 text-center text-sm text-muted-foreground">No workouts match your search.</p>
            ) : (
              <div className="space-y-3">
                {matchedWorkouts.map((w) => (
                  <WorkoutCard key={w.id} workout={w} showLocationDetails />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

