'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Check, ChevronLeft, Dumbbell, ImagePlus, MoreHorizontal, Pencil, Send, Trash2, Users, X } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { formatTime, formatDateLabel, relativeMessageTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase-client'
import type { ChatMessage } from '@/lib/types'
import { ChatMedia, removeChatMedia, uploadChatMedia } from '../chat-media'

export function Chat({ id }: { id: string }) {
  const { workouts, getUser, messagesFor, sendMessage, editMessage, deleteMessage, currentUserId, pushToast } = useStore()
  const { back } = useNav()
  const [text, setText] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [persistedMessages, setPersistedMessages] = useState<ChatMessage[]>([])
  const composingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)


  const workout = workouts.find((w) => w.id === id)
  const isPersistedChat = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  const sessionMessages = messagesFor(id)
  const messages = isPersistedChat ? persistedMessages : sessionMessages

  const loadPersistedMessages = useCallback(async () => {
    if (!isPersistedChat) return
    const { data, error } = await supabase
      .from('crew_messages')
      .select('id, workout_id, user_id, text, media_path, media_kind, created_at')
      .eq('workout_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load Crew Chat messages:', error)
      setActionError(error.message)
      return
    }

    setPersistedMessages((data ?? []).map((message) => ({
      id: message.id,
      workoutId: message.workout_id,
      userId: message.user_id,
      text: message.text ?? '',
      mediaPath: message.media_path ?? undefined,
      mediaKind: message.media_kind ?? undefined,
      createdAt: new Date(message.created_at).getTime(),
    })))
    setActionError(null)
  }, [id, isPersistedChat])

  useEffect(() => {
    if (!isPersistedChat) return
    void loadPersistedMessages()
    const channel = supabase
      .channel(`crew-messages:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crew_messages', filter: `workout_id=eq.${id}` },
        () => void loadPersistedMessages(),
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [id, isPersistedChat, loadPersistedMessages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])

  if (!workout) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">This chat is no longer available.</p>
        <button
          type="button"
          onClick={back}
          className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-secondary-foreground"
        >
          Go back
        </button>
      </div>
    )
  }

  const host = getUser(workout.hostId)

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (!isPersistedChat) {
      sendMessage(id, trimmed)
      setText('')
      return
    }

    setActionError(null)
    const { error } = await supabase
      .from('crew_messages')
      .insert({ workout_id: id, user_id: currentUserId, text: trimmed })
      .select('id')
      .single()
    if (error) {
      setActionError(error.message)
      pushToast({ title: 'Message was not sent', body: error.message })
      return
    }
    setText('')
    await loadPersistedMessages()
  }

  const sendMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || uploading || !isPersistedChat) return

    setUploading(true)
    setActionError(null)
    const upload = await uploadChatMedia(file, currentUserId)
    if (!upload.ok) {
      setActionError(upload.error)
      pushToast({ title: 'Image not sent', body: upload.error })
      setUploading(false)
      return
    }

    const { error } = await supabase
      .from('crew_messages')
      .insert({
        workout_id: id,
        user_id: currentUserId,
        text: null,
        media_path: upload.path,
        media_kind: upload.kind,
      })
      .select('id')
      .single()

    if (error) {
      await removeChatMedia(upload.path)
      setActionError(error.message)
      pushToast({ title: 'Image not sent', body: error.message })
      setUploading(false)
      return
    }

    await loadPersistedMessages()
    setUploading(false)
  }

  const saveEdit = async (messageId: string) => {
    if (!editText.trim() || savingId) return
    setSavingId(messageId)
    setActionError(null)
    const result = isPersistedChat
      ? await (async () => {
          const { data, error } = await supabase
            .from('crew_messages')
            .update({ text: editText.trim() })
            .eq('id', messageId)
            .eq('user_id', currentUserId)
            .select('id')
          if (error || !data?.length) return { ok: false, error: error?.message ?? 'Supabase did not confirm the edit.' }
          await loadPersistedMessages()
          return { ok: true }
        })()
      : await editMessage(messageId, editText)
    if (!result.ok) {
      const error = result.error ?? 'The message could not be updated.'
      setActionError(error)
      pushToast({ title: 'Edit failed', body: error })
      setSavingId(null)
      return
    }
    setEditingId(null)
    setEditText('')
    setSavingId(null)
  }

  const removeMessage = async (messageId: string) => {
    if (deletingId) return
    setDeletingId(messageId)
    setActionError(null)
    const result = isPersistedChat
      ? await (async () => {
          const { data, error } = await supabase
            .from('crew_messages')
            .delete()
            .eq('id', messageId)
            .eq('user_id', currentUserId)
            .select('id')
          if (error || !data?.length) return { ok: false, error: error?.message ?? 'Supabase did not confirm the deletion.' }
          await loadPersistedMessages()
          return { ok: true }
        })()
      : await deleteMessage(messageId)
    if (!result.ok) {
      const error = result.error ?? 'The message could not be deleted.'
      setActionError(error)
      pushToast({ title: 'Delete failed', body: error })
      setDeletingId(null)
      return
    }
    setOpenMenuId(null)
    setConfirmDeleteId(null)
    setDeletingId(null)
  }


