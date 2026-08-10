import { supabase } from '@/lib/supabase-client'

export type FriendRequestState =
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'accepted'

type FriendRequestResult = {
  ok: boolean
  state: FriendRequestState
  created?: boolean
  error?: string
}

function stateFor(
  request: { sender_id: string; status: string } | null,
  currentUserId: string,
): FriendRequestState {
  if (!request) return 'none'
  if (request.status === 'accepted') return 'accepted'
  return request.sender_id === currentUserId ? 'pending_outgoing' : 'pending_incoming'
}

export async function getFriendRequestStates(currentUserId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('sender_id, receiver_id, status')
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .in('status', ['pending', 'accepted'])

  if (error) return { states: {} as Record<string, FriendRequestState>, error: error.message }

  const states: Record<string, FriendRequestState> = {}
  for (const request of data ?? []) {
    const otherId = request.sender_id === currentUserId
      ? request.receiver_id
      : request.sender_id
    states[otherId] = stateFor(request, currentUserId)
  }

  return { states }
}

export async function getFriendRequestState(
  currentUserId: string,
  otherUserId: string,
): Promise<FriendRequestResult> {
  if (!currentUserId || currentUserId === otherUserId) {
    return { ok: false, state: 'none', error: 'You cannot send a friend request to yourself.' }
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .select('sender_id, receiver_id, status')
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`,
    )
    .in('status', ['pending', 'accepted'])
    .maybeSingle()

  if (error) return { ok: false, state: 'none', error: error.message }
  return { ok: true, state: stateFor(data, currentUserId) }
}

export async function sendFriendRequest(
  currentUserId: string,
  receiverId: string,
): Promise<FriendRequestResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, state: 'none', error: 'Your session could not be verified. Please sign in again.' }
  }
  if (user.id !== currentUserId) {
    return { ok: false, state: 'none', error: 'Your account changed. Refresh and try again.' }
  }

  const existing = await getFriendRequestState(currentUserId, receiverId)
  if (!existing.ok || existing.state !== 'none') return existing

  const { data: receiver, error: receiverError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', receiverId)
    .maybeSingle()

  if (receiverError || !receiver) {
    return { ok: false, state: 'none', error: receiverError?.message ?? 'That profile no longer exists.' }
  }

  const { data: inserted, error } = await supabase
    .from('friend_requests')
    .insert({ sender_id: user.id, receiver_id: receiver.id, status: 'pending' })
    .select('sender_id, receiver_id, status')
    .single()

  if (
    error ||
    !inserted ||
    inserted.sender_id !== user.id ||
    inserted.receiver_id !== receiver.id ||
    inserted.status !== 'pending'
  ) {
    return {
      ok: false,
      state: 'none',
      error: error?.code === '23505'
        ? 'A pending or accepted request already exists between these accounts.'
        : error?.message ?? 'Supabase did not confirm the friend request.',
    }
  }

  return { ok: true, state: 'pending_outgoing', created: true }
}

export async function cancelFriendRequest(
  currentUserId: string,
  receiverId: string,
): Promise<FriendRequestResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user || user.id !== currentUserId) {
    return { ok: false, state: 'pending_outgoing', error: 'Your session could not be verified. Please sign in again.' }
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('sender_id', currentUserId)
    .eq('receiver_id', receiverId)
    .eq('status', 'pending')
    .select('id')

  if (error) return { ok: false, state: 'pending_outgoing', error: error.message }
  if (!data || data.length === 0) {
    return { ok: false, state: 'pending_outgoing', error: 'No outgoing request was canceled.' }
  }

  return { ok: true, state: 'none' }
}
