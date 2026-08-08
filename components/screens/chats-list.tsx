'use client'

import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Globe, ChevronRight, Crown, Lock } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { WorkoutTypeIcon } from '../workout-type-icon'
import { formatTime, formatDateLabel, relativeMessageTime } from '@/lib/date-utils'
import { COMMUNITY_CHANNEL_ID } from '@/lib/seed'
import { supabase } from '@/lib/supabase-client'

export function ChatsList() {
  const { workouts, messages, getUser, hasJoined, currentUserId, isPremium } = useStore()
  const { openChat, openCommunity, openPaywall } = useNav()

  type FriendRequest = {
  id: string
  sender_id: string
  sender_name: string | null
  sender_email: string | null
}

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const openCrew = (id: string) => (isPremium ? openChat(id) : openPaywall('Crew chats'))

  useEffect(() => {
  const loadFriendRequests = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('id, sender_id')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')

    if (error) {
      console.error('Failed to load friend requests:', error)
      return
    }

    if (!requests || requests.length === 0) {
      setFriendRequests([])
      return
    }

    const senderIds = requests.map((request) => request.sender_id)

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', senderIds)

    if (profileError) {
      console.error('Failed to load sender profiles:', profileError)
      return
    }

    setFriendRequests(
      requests.map((request) => {
        const profile = profiles?.find((p) => p.id === request.sender_id)

        return {
          id: request.id,
          sender_id: request.sender_id,
          sender_name: profile?.display_name ?? null,
          sender_email: profile?.email ?? null,
        }
      }),
    )
  }

  loadFriendRequests()
}, [])

const acceptFriendRequest = async (requestId: string) => {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)

  if (error) {
    console.error('Failed to accept friend request:', error)
    return
  }

  setFriendRequests((current) =>
    current.filter((request) => request.id !== requestId),
  )
}

const declineFriendRequest = async (requestId: string) => {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)

  if (error) {
    console.error('Failed to decline friend request:', error)
    return
  }

  setFriendRequests((current) =>
    current.filter((request) => request.id !== requestId),
  )
}

  const communityCount = useMemo(
    () => messages.filter((m) => m.workoutId === COMMUNITY_CHANNEL_ID).length,
    [messages],
  )

  const myWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => w.hostId === currentUserId || hasJoined(w))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [workouts, hasJoined, currentUserId],
  )

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-5 pb-2 pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Chats</h1>
        <p className="text-sm text-muted-foreground">The public community plus your crew chats.</p>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-3">

        {friendRequests.length > 0 ? (
  <section className="mb-4">
    <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
      Friend Requests
    </p>

    <div className="space-y-2">
      {friendRequests.map((request) => (
        <div
          key={request.id}
          className="rounded-2xl bg-card p-3 ring-1 ring-border"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {(request.sender_name || request.sender_email || '?')
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-card-foreground">
                {request.sender_name || 'WAITS User'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {request.sender_email}
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => acceptFriendRequest(request.id)}
              className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground"
            >
              Accept
            </button>

            <button
              type="button"
              onClick={() => declineFriendRequest(request.id)}
              className="flex-1 rounded-xl border border-border py-2 text-xs font-bold text-foreground"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  </section>
) : null}
        {/* Public community channel — pinned entry point */}
        <button
          type="button"
          onClick={openCommunity}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-primary p-3.5 text-left text-primary-foreground shadow-md shadow-primary/25"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Globe size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">Waits Community</p>
            <p className="truncate text-xs text-primary-foreground/80">
              Public channel · {communityCount} posts
            </p>
          </div>
          <ChevronRight size={20} className="shrink-0 text-primary-foreground/70" />
        </button>

        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Crew Chats
        </p>

        {!isPremium && myWorkouts.length > 0 ? (
          <button
            type="button"
            onClick={() => openPaywall('Crew chats')}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-accent p-3.5 text-left text-accent-foreground"
          >
            <Crown size={20} className="shrink-0" />
            <span className="flex-1 text-xs font-semibold">
              Crew chats are a Waits Pro feature. Upgrade to message your workout groups.
            </span>
            <ChevronRight size={18} className="shrink-0 opacity-70" />
          </button>
        ) : null}

        {myWorkouts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-3xl bg-secondary text-muted-foreground">
              <MessageCircle size={30} />
            </span>
            <h2 className="mt-4 text-lg font-bold text-foreground">No active chats</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Join or post a workout and a chat opens automatically.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {myWorkouts.map((w) => {
              const host = getUser(w.hostId)
              const last = messages
                .filter((m) => m.workoutId === w.id)
                .sort((a, b) => b.createdAt - a.createdAt)[0]
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => openCrew(w.id)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-border"
                  >
                    <span className="relative">
                      <Avatar user={host} size={48} />
                      <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-lime text-lime-foreground ring-2 ring-card">
                        <WorkoutTypeIcon type={w.types[0]} size={12} />
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-card-foreground">
                        {w.types.join(' + ')} · {w.hostId === currentUserId ? 'You' : host.name.split(' ')[0]}
                      </p>
                      {isPremium ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {last ? (
                            <>
                              {last.userId === currentUserId
                                ? 'You: '
                                : `${getUser(last.userId).name.split(' ')[0]}: `}
                              {last.text}
                            </>
                          ) : (
                            `${formatDateLabel(w.date)} · ${formatTime(w.time)}`
                          )}
                        </p>
                      ) : (
                        <p className="flex items-center gap-1 truncate text-xs font-medium text-primary">
                          <Lock size={11} />
                          Unlock with Waits Pro
                        </p>
                      )}
                    </div>
                    {isPremium && last ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {relativeMessageTime(last.createdAt)}
                      </span>
                    ) : !isPremium ? (
                      <Crown size={16} className="shrink-0 text-primary" />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
