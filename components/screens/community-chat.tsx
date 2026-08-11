'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Clock3, Globe, Send, MapPin } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { relativeMessageTime } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'

const COMMUNITY_MESSAGE_LIFETIME_MS = 24 * 60 * 60 * 1000

type CommunityMessageRow = {
  id: string
  user_id: string
  text: string
  created_at: string
}

const isUnexpired = (message: CommunityMessageRow, now = Date.now()) =>
  new Date(message.created_at).getTime() > now - COMMUNITY_MESSAGE_LIFETIME_MS

export function CommunityChat() {
  const { getUser, currentUserId, users, pushToast } = useStore()
  const { back, openUser } = useNav()
  const [messages, setMessages] = useState<CommunityMessageRow[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const composingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const cutoff = new Date(Date.now() - COMMUNITY_MESSAGE_LIFETIME_MS).toISOString()
    const { data, error: loadError } = await supabase
      .from('community_messages')
      .select('id, user_id, text, created_at')
      .gt('created_at', cutoff)
      .order('created_at', { ascending: true })

    if (loadError) {
      setError(`Could not load Community Chat: ${loadError.message}`)
    } else {
      setMessages((data ?? []).filter((message) => isUnexpired(message)))
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('community-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_messages' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Partial<CommunityMessageRow>).id
            if (deletedId) setMessages((current) => current.filter((message) => message.id !== deletedId))
            return
          }

          const message = payload.new as CommunityMessageRow
          if (!isUnexpired(message)) return
          setMessages((current) =>
            [...current.filter((item) => item.id !== message.id), message].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            ),
          )
        },
      )
      .subscribe(() => void loadMessages())

    const removeExpired = window.setInterval(() => {
      setMessages((current) => current.filter((message) => isUnexpired(message)))
    }, 15_000)
    const refresh = () => void loadMessages()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(removeExpired)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      void supabase.removeChannel(channel)
    }
  }, [loadMessages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])

  const visibleMessages = useMemo(
    () => messages.filter((message) => isUnexpired(message)),
    [messages],
  )

  const submit = async () => {
    const trimmedText = text.trim()
    if (!trimmedText || sending) return

    setSending(true)
    setError(null)
    const { data, error: sendError } = await supabase
      .from('community_messages')
      .insert({ user_id: currentUserId, text: trimmedText })
      .select('id, user_id, text, created_at')
      .single()

    if (sendError || !data) {
      const message = sendError?.message ?? 'Supabase did not confirm the message.'
      setError(`Message was not sent: ${message}`)
      pushToast({ title: 'Message not sent', body: message })
      setSending(false)
      return
    }

    setMessages((current) =>
      [...current.filter((message) => message.id !== data.id), data].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    )
    setText('')
    setSending(false)
  }


  const saveEdit = async (messageId: string) => {
    const trimmedText = editText.trim()
    if (!trimmedText || mutatingId) return

    setMutatingId(messageId)
    setError(null)
    const { data, error: updateError } = await supabase
      .from('community_messages')
      .update({ text: trimmedText })
      .eq('id', messageId)
      .eq('user_id', currentUserId)
      .select('id, user_id, text, created_at')
      .single()

    if (updateError || !data) {
      const message = updateError?.message ?? 'Supabase did not confirm the edit.'
      setError(`Message was not updated: ${message}`)
      pushToast({ title: 'Edit failed', body: message })
      setMutatingId(null)
      return
    }

    setMessages((current) => current.map((message) => message.id === data.id ? data : message))
    setEditingId(null)
    setEditText('')
    setMutatingId(null)
  }

  const deleteMessage = async (messageId: string) => {
    if (mutatingId) return
    setMutatingId(messageId)
    setError(null)

    const { data, error: deleteError } = await supabase
      .from('community_messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', currentUserId)
      .select('id')
      .single()

    if (deleteError || !data) {
      const message = deleteError?.message ?? 'Supabase did not confirm the deletion.'
      setError(`Message was not deleted: ${message}`)
      pushToast({ title: 'Delete failed', body: message })
      setMutatingId(null)
      return
    }

    setMessages((current) => current.filter((message) => message.id !== messageId))
    if (editingId === messageId) {
      setEditingId(null)
      setEditText('')
    }
    setMutatingId(null)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="shrink-0 bg-primary px-3 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-primary-foreground">
        <div className="flex items-center gap-3">
          <button type="button" onClick={back} className="flex size-9 items-center justify-center rounded-full bg-white/15" aria-label="Back">
            <ChevronLeft size={22} />
          </button>
          <span className="flex size-10 items-center justify-center rounded-2xl bg-white/15"><Globe size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">Waits Community</p>
            <p className="truncate text-xs text-primary-foreground/75">{users.length} lifters · Public channel</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
        <div className="mx-auto mb-1 flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
          <Clock3 size={12} /> Messages disappear after 24 hours.
        </div>
        {error ? <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p> : null}
        {loading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading messages…</p> : null}
        {!loading && visibleMessages.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No messages from the last 24 hours.</p> : null}
        {visibleMessages.map((message) => {
          const user = getUser(message.user_id)
          const mine = message.user_id === currentUserId
          return (
            <article key={message.id} className={cn('flex gap-3 rounded-2xl p-3 ring-1', mine ? 'bg-accent/40 ring-accent' : 'bg-card ring-border')}>
              <button type="button" onClick={() => openUser(message.user_id)} aria-label={`View ${user.name}'s profile`} className="shrink-0 self-start">
                <Avatar user={user} size={40} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-bold text-card-foreground">{mine ? 'You' : user.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{relativeMessageTime(new Date(message.created_at).getTime())}</span>
                </div>
                <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><MapPin size={10} />{user.homeGym}</p>
                {editingId === message.id ? (
                  <div className="mt-2 space-y-2">
                    <input value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={2000} autoFocus className="w-full rounded-xl bg-background px-3 py-2 text-sm text-foreground outline-none ring-1 ring-border focus:ring-2 focus:ring-primary" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void saveEdit(message.id)} disabled={!editText.trim() || mutatingId === message.id} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-40">Save</button>
                      <button type="button" onClick={() => { setEditingId(null); setEditText('') }} disabled={mutatingId === message.id} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground disabled:opacity-40">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-1.5 text-sm leading-relaxed text-card-foreground">{message.text}</p>
                    {mine ? (
                      <div className="mt-2 flex gap-3">
                        <button type="button" onClick={() => { setEditingId(message.id); setEditText(message.text) }} disabled={Boolean(mutatingId)} className="text-xs font-semibold text-primary disabled:opacity-40">Edit</button>
                        <button type="button" onClick={() => void deleteMessage(message.id)} disabled={Boolean(mutatingId)} className="text-xs font-semibold text-destructive disabled:opacity-40">{mutatingId === message.id ? 'Deleting…' : 'Delete'}</button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <div className="flex shrink-0 items-end gap-2 border-t border-border bg-card/95 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
        <input value={text} onChange={(event) => setText(event.target.value)} onCompositionStart={() => (composingRef.current = true)} onCompositionEnd={() => (composingRef.current = false)} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !composingRef.current && event.nativeEvent.keyCode !== 229) { event.preventDefault(); void submit() }
        }} placeholder="Post to the community…" className="min-w-0 flex-1 rounded-full bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
        <button type="button" onClick={() => void submit()} disabled={!text.trim() || sending} aria-label="Post" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-90 disabled:opacity-40"><Send size={18} /></button>
      </div>
    </div>
  )
}
