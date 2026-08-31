'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ChevronLeft, ImagePlus, Send, ShieldCheck } from 'lucide-react'
import { Avatar } from '../avatar'
import { ChatMedia, removeChatMedia, uploadChatMedia } from '../chat-media'
import { useNav } from '../navigation'
import { useStore } from '../store'
import { supabase } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'
import { relativeMessageTime } from '@/lib/date-utils'

type DirectMessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  text: string | null
  media_path: string | null
  media_kind: 'image' | 'gif' | null
  created_at: string
}

export function DirectMessage({ id }: { id: string }) {
  const { back, openPaywall } = useNav()
  const { currentUserId, getUser, pushToast, isPremium } = useStore()
  const [otherId, setOtherId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DirectMessageRow[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConversation = useCallback(async () => {
    if (!isPremium) { setMessages([]); setOtherId(null); return }
    const { data: conversation, error: conversationError } = await supabase
      .from('direct_conversations')
      .select('participant_a, participant_b')
      .eq('id', id)
      .single()

    if (conversationError || !conversation) {
      setMessages([])
      setOtherId(null)
      setError('This conversation requires two connected Pro members.')
      return
    }

    setOtherId(conversation.participant_a === currentUserId ? conversation.participant_b : conversation.participant_a)
    const { data, error: messageError } = await supabase
      .from('direct_messages')
      .select('id, conversation_id, sender_id, text, media_path, media_kind, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (messageError) {
      setError(messageError.message)
      return
    }
    setMessages((data ?? []) as DirectMessageRow[])
    setError(null)
  }, [currentUserId, id, isPremium])

  useEffect(() => {
    if (!isPremium) { setMessages([]); setOtherId(null); return }
    void loadConversation()
    const channel = supabase
      .channel(`direct-messages:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${id}` }, () => void loadConversation())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [id, loadConversation, isPremium])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])


  const sendText = async () => {
    const trimmed = text.trim()
    if (!isPremium || !otherId || !trimmed || sending) return
    setSending(true)
    const { error: sendError } = await supabase
      .from('direct_messages')
      .insert({ conversation_id: id, sender_id: currentUserId, text: trimmed })
    if (sendError) {
      setError(sendError.message)
      pushToast({ title: 'Message not sent', body: sendError.message })
    } else {
      setText('')
      await loadConversation()
    }
    setSending(false)
  }

  const sendMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!isPremium || !otherId || !file || sending) return
    setSending(true)

    const upload = await uploadChatMedia(file, currentUserId)
    if (!upload.ok) {
      setError(upload.error)
      pushToast({ title: 'Image not sent', body: upload.error })
      setSending(false)
      return
    }

    const { error: sendError } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: id,
        sender_id: currentUserId,
        text: null,
        media_path: upload.path,
        media_kind: upload.kind,
      })

    if (sendError) {
      await removeChatMedia(upload.path)
      setError(sendError.message)
      pushToast({ title: 'Image not sent', body: sendError.message })
    } else {
      await loadConversation()
    }
    setSending(false)
  }

  if (!isPremium) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">Personal DMs Are Pro Only</h1>
      <p className="text-sm text-muted-foreground">Free members can chat in workouts they host or join.</p>
      <button onClick={() => openPaywall('Personal DMs')} className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Upgrade To Pro</button>
      <button onClick={back} className="text-sm font-bold">Back</button>
    </div>
  )

  const other = otherId ? getUser(otherId) : null

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button type="button" onClick={back} className="flex size-9 items-center justify-center rounded-full bg-secondary" aria-label="Back">
          <ChevronLeft size={21} />
        </button>
        {other ? <Avatar user={other} size={40} /> : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-extrabold text-card-foreground">{other?.name ?? 'Direct Message'}</h1>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><ShieldCheck size={11} /> Connected Pro members only</p>
        </div>
      </header>

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-[16rem] text-center">
            <p className="text-sm font-bold text-foreground">Start the conversation</p>
            <p className="mt-1 text-xs text-muted-foreground">Only you and your connection can see these messages.</p>
          </div>
        ) : messages.map((message) => {
          const mine = message.sender_id === currentUserId
          return (
            <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[78%] rounded-2xl px-3.5 py-2 text-sm', mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-card text-card-foreground ring-1 ring-border')}>
                {message.text ? <p>{message.text}</p> : null}
                {message.media_path ? <ChatMedia path={message.media_path} alt="Direct message upload" /> : null}
                <p className={cn('mt-1 text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{relativeMessageTime(new Date(message.created_at).getTime())}</p>
              </div>
            </div>
          )
        })}
      </div>

      {error ? <p className="bg-destructive/10 px-4 py-2 text-center text-xs font-semibold text-destructive">{error}</p> : null}

      <div className="flex shrink-0 items-end gap-2 border-t border-border bg-card/95 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
        <input ref={mediaInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={sendMedia} className="hidden" />
        <button type="button" onClick={() => mediaInputRef.current?.click()} disabled={sending} aria-label="Add photo" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary disabled:opacity-40">
          <ImagePlus size={19} />
        </button>
        <input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendText() } }} placeholder="Message your connection…" className="min-w-0 flex-1 rounded-full bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
        <button type="button" onClick={() => void sendText()} disabled={!text.trim() || sending} aria-label="Send" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground disabled:opacity-40"><Send size={18} /></button>
      </div>
    </div>
  )
}
