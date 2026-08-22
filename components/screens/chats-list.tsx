'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageCircle, Globe, ChevronRight, Crown, Lock, Bell } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { WorkoutTypeIcon } from '../workout-type-icon'
import { formatTime, formatDateLabel, relativeMessageTime } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase-client'
import { SectionWordmark } from '../section-wordmark'

export function ChatsList() {
  const { workouts, messages, getUser, hasJoined, currentUserId, isPremium, pushToast, refreshSocialState } = useStore()
  const { openChat, openCommunity, openDm, openPaywall } = useNav()

  type FriendRequest = {
  id: string
  sender_id: string
  sender_name: string | null
  sender_email: string | null
}

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [directConnections, setDirectConnections] = useState<Array<{ otherId: string; conversationId: string | null }>>([])
  const [startingDm, setStartingDm] = useState<string | null>(null)
  const openCrew = (workoutId: string, isHost: boolean) =>
    (isHost || isPremium ? openChat(workoutId) : openPaywall('Crew chats'))

  const loadFriendRequests = useCallback(async () => {
    setRequestError(null)
    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('id, sender_id')
      .eq('receiver_id', currentUserId)
      .eq('status', 'pending')

    if (error) {
      setRequestError(`Could not load friend requests: ${error.message}`)
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
  }, [currentUserId])

  useEffect(() => {
    void loadFriendRequests()

    const channel = supabase
      .channel(`incoming-friend-requests:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => void loadFriendRequests(),
      )
      .subscribe()

    const refresh = () => void loadFriendRequests()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      void supabase.removeChannel(channel)
    }
  }, [currentUserId, loadFriendRequests])

const acceptFriendRequest = async (requestId: string) => {
  setRespondingTo(requestId)
  setRequestError(null)
  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .eq('receiver_id', currentUserId)
    .eq('status', 'pending')
    .select('id, status')
    .single()

  if (error || data?.status !== 'accepted') {
    setRequestError(error?.message ?? 'The request was not accepted. Refresh and try again.')
    setRespondingTo(null)
    return
  }

  await Promise.all([loadFriendRequests(), refreshSocialState()])
  pushToast({ title: 'Friend request accepted' })
  setRespondingTo(null)
}

const declineFriendRequest = async (requestId: string) => {
  setRespondingTo(requestId)
  setRequestError(null)
  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .eq('receiver_id', currentUserId)
    .eq('status', 'pending')
    .select('id, status')
    .single()

  if (error || data?.status !== 'declined') {
    setRequestError(error?.message ?? 'The request was not declined. Refresh and try again.')
    setRespondingTo(null)
    return
  }

  await Promise.all([loadFriendRequests(), refreshSocialState()])
  pushToast({ title: 'Friend request declined' })
  setRespondingTo(null)
}

  const loadDirectConnections = useCallback(async () => {
    const { data: accepted, error: connectionError } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)

    if (connectionError) {
      setRequestError(connectionError.message)
      return
    }

    const { data: conversations, error: conversationError } = await supabase
      .from('direct_conversations')
      .select('id, participant_a, participant_b')

    if (conversationError) {
      setRequestError(conversationError.message)
      return
    }

    const connectionIds = (accepted ?? []).map((row) =>
      row.sender_id === currentUserId ? row.receiver_id : row.sender_id,
    )
    setDirectConnections(connectionIds.map((otherId) => {
      const conversation = conversations?.find((row) =>
        (row.participant_a === currentUserId && row.participant_b === otherId)
        || (row.participant_b === currentUserId && row.participant_a === otherId),
      )
      return { otherId, conversationId: conversation?.id ?? null }
    }))
  }, [currentUserId])

  useEffect(() => {
    void loadDirectConnections()
  }, [loadDirectConnections])

  const startDirectMessage = async (otherId: string, conversationId: string | null) => {
    if (conversationId) {
      openDm(conversationId)
      return
    }
    if (!isPremium) {
      openPaywall('Start personal DMs')
      return
    }

    setStartingDm(otherId)
    const [participantA, participantB] = [currentUserId, otherId].sort()
    const { data, error } = await supabase
      .from('direct_conversations')
      .insert({
        participant_a: participantA,
        participant_b: participantB,
        created_by: currentUserId,
      })
      .select('id')
      .single()

    if (error || !data) {
      const { data: existing } = await supabase
        .from('direct_conversations')
        .select('id')
        .or(`and(participant_a.eq.${participantA},participant_b.eq.${participantB})`)
        .maybeSingle()
      if (existing?.id) openDm(existing.id)
      else {
        setRequestError(error?.message ?? 'The conversation could not be started.')
        pushToast({ title: 'DM unavailable', body: error?.message })
      }
    } else {
      openDm(data.id)
    }
    setStartingDm(null)
    void loadDirectConnections()
  }

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
        <SectionWordmark>Chats</SectionWordmark>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-3">

        {friendRequests.length > 0 ? (
  <section className="mb-4">
    <p className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-primary">
      <Bell size={14} /> Friend Requests ({friendRequests.length})
    </p>

    {requestError ? <p role="alert" className="mb-2 text-sm text-red-600">{requestError}</p> : null}

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
              disabled={respondingTo === request.id}
              className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground"
            >
              Accept
            </button>

            <button
              type="button"
              onClick={() => declineFriendRequest(request.id)}
              disabled={respondingTo === request.id}
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
        <section className="mb-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personal DMs</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary"><Crown size={11} /> Pro starts</span>
          </div>
          {directConnections.length === 0 ? (
            <div className="rounded-2xl bg-card p-3 text-center text-xs text-muted-foreground ring-1 ring-border">
              Connect with someone to start a private conversation.
            </div>
          ) : (
            <div className="space-y-2">
              {directConnections.map(({ otherId, conversationId }) => {
                const person = getUser(otherId)
                return (
                  <button
                    key={otherId}
                    type="button"
                    onClick={() => void startDirectMessage(otherId, conversationId)}
                    disabled={startingDm === otherId}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-border disabled:opacity-50"
                  >
                    <Avatar user={person} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-card-foreground">{person.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {conversationId ? 'Open private conversation' : isPremium ? 'Start a private conversation' : 'Waits Pro can start this DM'}
                      </span>
                    </span>
                    {!conversationId && !isPremium ? <Lock size={17} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
                  </button>
                )
              })}
            </div>
          )}
        </section>

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
              Public channel · Messages expire after 24 hours
            </p>
          </div>
          <ChevronRight size={20} className="shrink-0 text-primary-foreground/70" />
        </button>

        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Crew Chats
        </p>

        {!isPremium && myWorkouts.some((workout) => workout.hostId !== currentUserId) ? (
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
              const canAccessCrew = w.hostId === currentUserId || isPremium
              const last = messages
                .filter((m) => m.workoutId === w.id)
                .sort((a, b) => b.createdAt - a.createdAt)[0]
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => openCrew(w.id, w.hostId === currentUserId)}
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
                      {canAccessCrew ? (
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
                    {canAccessCrew && last ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {relativeMessageTime(last.createdAt)}
                      </span>
                    ) : !canAccessCrew ? (
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

