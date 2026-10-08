import { supabase } from '@/lib/supabase-client'

export type MessagingPreferences = {
  whoCanMessage: 'friends' | 'everyone' | 'no_one'
  showWhenOnline: boolean
}
export type MessagingRecipient = {
  id: string
  displayName: string
  username: string | null
  avatarPath: string | null
  isPro: boolean
}
export type MessagingInboxItem = {
  conversationId: string
  recipientId: string
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
}

async function authenticatedUserId(expectedUserId?: string) {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sign in to use messaging.')
  if (expectedUserId && data.user.id !== expectedUserId) throw new Error('Your account changed. Reopen Messages and try again.')
  return data.user.id
}

export async function getMessagingPreferences(expectedUserId?: string): Promise<MessagingPreferences> {
  const userId = await authenticatedUserId(expectedUserId)
  const { data, error } = await supabase.from('messaging_preferences')
    .select('who_can_message,show_when_online').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return { whoCanMessage: data?.who_can_message ?? 'friends', showWhenOnline: data?.show_when_online ?? true }
}

export async function saveMessagingPreferences(preferences: MessagingPreferences, expectedUserId?: string): Promise<void> {
  const userId = await authenticatedUserId(expectedUserId)
  const { error } = await supabase.from('messaging_preferences').upsert({
    user_id: userId, who_can_message: preferences.whoCanMessage,
    show_when_online: preferences.showWhenOnline,
  }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function getMessagingRecipients(search = ''): Promise<MessagingRecipient[]> {
  await authenticatedUserId()
  const { data, error } = await supabase.rpc('get_messaging_recipients', { search_text: search.trim().slice(0, 80) })
  if (error) throw error
  return (data ?? []).map((row: { id: string; display_name: string | null; username: string | null; avatar_path: string | null; is_pro: boolean }) => ({
    id: row.id, displayName: row.display_name || row.username || 'WAITS member',
    username: row.username, avatarPath: row.avatar_path, isPro: row.is_pro,
  }))
}

export async function getMessagingInbox(): Promise<MessagingInboxItem[]> {
  await authenticatedUserId()
  const { data, error } = await supabase.rpc('get_messaging_inbox')
  if (error) throw error
  return (data ?? []).map((row: { conversation_id: string; recipient_id: string; last_message: string | null; last_message_at: string | null; unread_count: number }) => ({
    conversationId: row.conversation_id, recipientId: row.recipient_id,
    lastMessage: row.last_message, lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count),
  }))
}

export async function touchMessagingPresence(): Promise<void> {
  const userId = await authenticatedUserId()
  // Server trigger supplies the timestamp; clients cannot forge future activity.
  const { error } = await supabase.from('messaging_presence').upsert({ user_id: userId }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function getMessagingPresence(userId: string): Promise<boolean> {
  await authenticatedUserId()
  const { data, error } = await supabase.from('messaging_presence')
    .select('last_active_at').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return false // RLS hides non-friends, blocks and opted-out users.
  return Date.now() - new Date(data.last_active_at).getTime() < 90_000
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const userId = await authenticatedUserId()
  const { error } = await supabase.from('direct_conversation_reads').upsert({
    conversation_id: conversationId, user_id: userId,
  }, { onConflict: 'conversation_id,user_id' })
  if (error) throw error
}
