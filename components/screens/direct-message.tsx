'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { removeChatMedia, uploadChatMedia } from '../chat-media'
import { useNav } from '../navigation'
import { useStore } from '../store'
import { supabase } from '@/lib/supabase-client'
import { markConversationRead, getMessagingPresence } from '@/lib/messaging'
import { messagingUser, DirectMessageHeader, DirectMessageBubble, DirectMessageComposer } from './messaging-panels'
import type { User } from '@/lib/types'

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
  const { currentUserId, pushToast, isPremium } = useStore()
  const [otherId, setOtherId] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<User | null>(null)
  const [online, setOnline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)
  const loadingRequest = useRef(0)
  const activeIdentity = useRef<string | null>(null)
  const nearBottom = useRef(true)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const [messages, setMessages] = useState<DirectMessageRow[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConversation = useCallback(async () => {
    if (!isPremium) { setMessages([]); setOtherId(null); setLoading(false); return }
    const request = ++loadingRequest.current
    const { data: conversation, error: conversationError } = await supabase
      .from('direct_conversations')
      .select('participant_a, participant_b')
      .eq('id', id)
      .single()

    if (request !== loadingRequest.current) return
    if (conversationError || !conversation || ![conversation.participant_a, conversation.participant_b].includes(currentUserId)) {
      setMessages([])
      setOtherId(null)
      setError('This conversation is unavailable. Check your access and connection.')
      setLoading(false)
      return
    }

    const recipientId = conversation.participant_a === currentUserId ? conversation.participant_b : conversation.participant_a
    setOtherId(recipientId)
    const profileRequest = supabase.from('profiles').select('id, display_name, username, avatar_path, is_pro').eq('id', recipientId).maybeSingle()
    const { data, error: messageError } = await supabase
      .from('direct_messages')
      .select('id, conversation_id, sender_id, text, media_path, media_kind, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    const profile = await profileRequest
    if (request !== loadingRequest.current) return
    if (profile.data) setRecipient(messagingUser({ id: profile.data.id, displayName: profile.data.display_name ?? 'WAITS User', username: profile.data.username ?? '', avatarPath: profile.data.avatar_path, isPro: profile.data.is_pro === true }))
    if (messageError) {
      setError('Could not load messages. Please try again.')
      setLoading(false)
      return
    }
    setMessages((data ?? []) as DirectMessageRow[])
    setError(null)
    setLoading(false)
    void markConversationRead(id).catch(() => {})
    void getMessagingPresence(recipientId).then((value) => { if (request === loadingRequest.current) setOnline(value) }).catch(() => { if (request === loadingRequest.current) setOnline(false) })
  }, [currentUserId, id, isPremium])

  useEffect(() => {
    if (!isPremium) { setMessages([]); setOtherId(null); return }
    activeIdentity.current = currentUserId + ':' + id
    nearBottom.current = true
    setMessages([]); setRecipient(null); setOtherId(null); setText(''); setSending(false); setOnline(false); setLoading(true); setError(null)
    void loadConversation()
    const channel = supabase
      .channel(`direct-messages:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${id}` }, () => void loadConversation())
      .subscribe()
    return () => { activeIdentity.current = null; loadingRequest.current++; void supabase.removeChannel(channel) }
  }, [id, loadConversation, isPremium])

  useEffect(() => {
    if (!otherId) return
    let active = true
    const refresh = () => { void getMessagingPresence(otherId).then((value) => { if (active) setOnline(value) }).catch(() => { if (active) setOnline(false) }) }
    refresh()
    const timer = window.setInterval(refresh, 45000)
    return () => { active = false; window.clearInterval(timer) }
  }, [otherId])

  useEffect(() => {
    if (nearBottom.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' })
  }, [messages.length])


  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    let frame = 0
    const resize = () => { setViewportHeight(viewport.height); cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (nearBottom.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }) }
    resize()
    viewport.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(frame); viewport.removeEventListener('resize', resize) }
  }, [])

  const sendText = async () => {
    const trimmed = text.trim()
    if (!isPremium || !otherId || !trimmed || sending) return
    const identity = activeIdentity.current
    setSending(true)
    const { error: sendError } = await supabase
      .from('direct_messages')
      .insert({ conversation_id: id, sender_id: currentUserId, text: trimmed })
    if (activeIdentity.current !== identity) return
    if (sendError) {
      setError('Message not sent. Your connection or messaging access may have changed.')
      pushToast({ title: 'Message not sent', body: sendError.message })
    } else {
      setText('')
      if (composerRef.current) composerRef.current.style.height = 'auto'
      nearBottom.current = true
      await loadConversation()
    }
    if (activeIdentity.current === identity) setSending(false)
  }

  const sendMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!isPremium || !otherId || !file || sending) return
    const identity = activeIdentity.current
    setSending(true)

    const upload = await uploadChatMedia(file, currentUserId)
    if (activeIdentity.current !== identity) { if (upload.ok) await removeChatMedia(upload.path); return }
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

    if (activeIdentity.current !== identity) { if (sendError) await removeChatMedia(upload.path); return }
    if (sendError) {
      await removeChatMedia(upload.path)
      setError(sendError.message)
      pushToast({ title: 'Image not sent', body: sendError.message })
    } else {
      nearBottom.current = true
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

  const other = recipient

  return (
    <div className="flex h-full min-h-0 flex-col bg-black text-white" style={viewportHeight ? { maxHeight: viewportHeight } : undefined}>
      <DirectMessageHeader recipient={other} online={online} onBack={back} />

      <div ref={scrollRef} onScroll={(event) => { const element = event.currentTarget; nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 90 }} className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-6">
        {loading ? <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-white/55"><LoaderCircle size={18} className="animate-spin" />Loading messages…</p> : error && messages.length === 0 ? <button type="button" onClick={() => { setLoading(true); void loadConversation() }} className="mx-auto block min-h-11 rounded-full bg-white/10 px-6 text-sm">Try Again</button> : messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-[16rem] text-center">
            <p className="text-sm font-bold text-foreground">Start the conversation</p>
            <p className="mt-1 text-xs text-muted-foreground">Only you and your connection can see these messages.</p>
          </div>
        ) : messages.map((message) => {
          const mine = message.sender_id === currentUserId
          return <DirectMessageBubble key={message.id} message={message} mine={mine} onMediaLoad={() => { if (nearBottom.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }} />
        })}
      </div>

      {error ? <p role="alert" className="bg-destructive/10 px-4 py-2 text-center text-xs font-semibold text-destructive">{error}</p> : null}

      <input ref={mediaInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={sendMedia} className="hidden" />
      <DirectMessageComposer text={text} onTextChange={setText} textareaRef={composerRef} onSend={() => void sendText()} onAddPhoto={() => mediaInputRef.current?.click()} disabled={!otherId} sending={sending} />
    </div>
  )
}
