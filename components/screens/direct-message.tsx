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
  const { back } = useNav()
  const { currentUserId, getUser, pushToast } = useStore()
  const [otherId, setOtherId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DirectMessageRow[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConversation = useCallback(async () => {
    const { data: conversation, error: conversationError } = await supabase
      .from('direct_conversations')
      .select('participant_a, participant_b')
      .eq('id', id)
      .single()

    if (conversationError || !conversation) {
      setError('This conversation is unavailable.')
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
  }, [currentUserId, id])

  useEffect(() => {
    void loadConversation()
    const channel = supabase
      .channel(`direct-messages:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${id}` }, () => void loadConversation())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [id, loadConversation])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])


  const sendText = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
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
    if (!file || sending) return
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

  const other = otherId ? getUser(otherId) : null


