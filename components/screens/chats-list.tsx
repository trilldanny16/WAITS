'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { WorkoutTypeIcon } from '../workout-type-icon'
import { formatTime, formatDateLabel, relativeMessageTime } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase-client'
import { useStartDirectMessage } from '../use-start-direct-message'
import { NewMessage, MessagingSettings, messagingUser, MessagingInboxHeader, MessagingInboxEmpty, MessagingInboxRow } from './messaging-panels'
import { getMessagingInbox } from '@/lib/messaging'
import type { User } from '@/lib/types'

export function ChatsList() {
  const { workouts, messages, getUser, hasJoined, currentUserId, isPremium, pushToast, refreshSocialState } = useStore()
  const { openChat, openPaywall, openDm, setTab } = useNav()

  type FriendRequest = {
  id: string
  sender_id: string
  sender_name: string | null
  sender_email: string | null
}

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [inbox, setInbox] = useState<Array<{ conversationId: string; recipientId: string; lastMessage: string | null; lastMessageAt: string | null; unreadCount: number }>>([])
  const [profiles, setProfiles] = useState<Record<string, User>>({})
  const { startDirectMessage, startingDm } = useStartDirectMessage()
  const [pane, setPane] = useState<'inbox' | 'compose' | 'settings'>('inbox')
  const [loadingConnections, setLoadingConnections] = useState(true)
  const [inboxError, setInboxError] = useState<string | null>(null)

  const inboxRequest = useRef(0)
  const accountEpoch = useRef(0)
  useEffect(() => { accountEpoch.current++; return () => { accountEpoch.current++ } }, [currentUserId])
  const openCrew = (workoutId: string) => openChat(workoutId)

  const loadFriendRequests = useCallback(async () => {
    const epoch = accountEpoch.current
    setRequestError(null)
    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('id, sender_id')
      .eq('receiver_id', currentUserId)
      .eq('status', 'pending')

    if (epoch !== accountEpoch.current) return
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

    if (epoch !== accountEpoch.current) return
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

  const loadInbox = useCallback(async () => {
    const request = ++inboxRequest.current
    if (!isPremium || !currentUserId) { setInbox([]); setLoadingConnections(false); return }
    const epoch = accountEpoch.current
    try {
      const rows = await getMessagingInbox()
      if (epoch !== accountEpoch.current || request !== inboxRequest.current) return
      const recipientIds = rows.map((row) => row.recipientId)
      if (recipientIds.length) {
        const { data, error } = await supabase.from('profiles').select('id, display_name, username, avatar_path, is_pro').in('id', recipientIds)
        if (epoch !== accountEpoch.current || request !== inboxRequest.current) return
        if (error) throw error
        setProfiles(Object.fromEntries((data ?? []).map((row) => [row.id, messagingUser({ id: row.id, displayName: row.display_name ?? 'WAITS User', username: row.username ?? '', avatarPath: row.avatar_path, isPro: row.is_pro === true })])))
      } else setProfiles({})
      setInbox(rows)
      setInboxError(null)
    } catch { if (epoch === accountEpoch.current && request === inboxRequest.current) setInboxError('Could not load your conversations. Please try again.') }
    finally { if (epoch === accountEpoch.current && request === inboxRequest.current) setLoadingConnections(false) }
  }, [currentUserId, isPremium])

  useEffect(() => {
    setInbox([]); setProfiles({}); setLoadingConnections(true); setPane('inbox')
    void loadInbox()
    const refresh = () => void loadInbox()
    window.addEventListener('focus', refresh)
    const channel = supabase.channel('dm-inbox:' + currentUserId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_conversations' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_conversation_reads', filter: 'user_id=eq.' + currentUserId }, refresh)
      .subscribe()
    return () => { window.removeEventListener('focus', refresh); void supabase.removeChannel(channel) }
  }, [loadInbox, currentUserId])

  const myWorkouts = useMemo(() => workouts.filter((workout) => workout.hostId === currentUserId || hasJoined(workout)).sort((a, b) => a.date.localeCompare(b.date)), [workouts, hasJoined, currentUserId])

  if (pane === 'compose') return <NewMessage currentUserId={currentUserId} onBack={() => setPane('inbox')} busy={startingDm !== null} onCreate={(recipientId) => { void startDirectMessage(recipientId).then((opened) => { if (opened) setPane('inbox') }) }} />
  if (pane === 'settings') return <MessagingSettings currentUserId={currentUserId} onBack={() => setPane('inbox')} />

  return <div className="flex h-full min-h-0 flex-col bg-black text-white">
    <MessagingInboxHeader onBack={() => setTab('home')} onCompose={() => isPremium ? setPane('compose') : openPaywall('Personal DMs')} onSettings={() => setPane('settings')} />
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-5">
      {friendRequests.length ? <section className="mb-4 rounded-2xl bg-[#111215] p-4"><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Bell size={16} className="text-lime" />Friend Requests ({friendRequests.length})</h2>
        {requestError ? <p role="alert" className="mb-3 text-sm text-destructive">{requestError}</p> : null}
        {friendRequests.map((request) => <div key={request.id} className="flex flex-wrap items-center gap-3 border-t border-white/5 py-3"><span className="flex min-w-0 flex-1 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">{(request.sender_name || 'W').charAt(0)}</span><span className="truncate text-sm font-semibold">{request.sender_name || 'WAITS User'}</span></span><button type="button" disabled={respondingTo === request.id} onClick={() => void acceptFriendRequest(request.id)} className="min-h-11 rounded-full bg-lime px-4 text-xs font-bold text-black disabled:opacity-50">Accept</button><button type="button" disabled={respondingTo === request.id} onClick={() => void declineFriendRequest(request.id)} className="min-h-11 px-2 text-xs text-white/60 disabled:opacity-50">Decline</button></div>)}
      </section> : null}
      {inboxError ? <div role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{inboxError}<button type="button" onClick={() => { setLoadingConnections(true); void loadInbox() }} className="mt-2 block min-h-11 text-white underline">Try Again</button></div> : null}
      {loadingConnections ? <p role="status" className="my-auto py-12 text-center text-sm text-white/55">Loading conversations…</p> : !inboxError && inbox.length === 0 ? <MessagingInboxEmpty isPremium={isPremium} onUpgrade={() => openPaywall('Personal DMs')} /> : <ul className="mb-6">{inbox.map((conversation) => {
        const person = profiles[conversation.recipientId]
        return <li key={conversation.conversationId}><MessagingInboxRow conversation={conversation} person={person} onOpen={() => openDm(conversation.conversationId)} /></li>
      })}</ul>}
      <section className="mt-auto shrink-0 border-t border-white/7 pt-3">
        {myWorkouts.length ? <><h2 className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-widest text-white/40">Workout Chats</h2>{myWorkouts.map((workout) => {
          const host = getUser(workout.hostId)
          const last = messages.filter((message) => message.workoutId === workout.id).sort((a, b) => b.createdAt - a.createdAt)[0]
          return <button type="button" key={workout.id} onClick={() => openCrew(workout.id)} className="flex min-h-18 w-full items-center gap-3 border-b border-white/5 px-2 py-3 text-left"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lime/10 text-lime"><WorkoutTypeIcon type={workout.types[0]} size={20} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{workout.types.join(' + ')} · {workout.hostId === currentUserId ? 'You' : host.name.split(' ')[0]}</span><span className="mt-1 block truncate text-xs text-white/45">{last ? (last.userId === currentUserId ? 'You: ' : getUser(last.userId).name.split(' ')[0] + ': ') + last.text : formatDateLabel(workout.date) + ' · ' + formatTime(workout.time)}</span></span>{last ? <span className="text-[10px] text-white/35">{relativeMessageTime(last.createdAt)}</span> : null}</button>
        })}</> : <p className="px-2 pb-2 pt-3 text-xs leading-relaxed text-white/40">Your workout chats appear here when you post or join a workout.</p>}
      </section>
    </div>
  </div>
}

