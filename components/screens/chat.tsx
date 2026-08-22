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

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card px-4 pb-4 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center">
          <button
            type="button"
            onClick={back}
            className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 px-3 text-center">
            <p className="truncate text-base font-bold text-foreground">
              {host.name.split(' ')[0]}&apos;s crew
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {workout.attendees.length} {workout.attendees.length === 1 ? 'member' : 'members'}
            </p>
          </div>
          <span className="size-10" aria-hidden="true" />
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-secondary p-3.5 text-left ring-1 ring-border">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{workout.types.join(' + ')}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {workout.gym} · {formatDateLabel(workout.date)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-primary">{formatTime(workout.time)}</p>
            <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <Users size={12} /> {workout.attendees.length}/{workout.maxParticipants}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
        <p className="mx-auto w-fit rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
          {formatDateLabel(workout.date)} · Participants only
        </p>
        {messages.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            Say hey — coordinate parking, timing, or what you&apos;re training.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.userId === currentUserId
            const u = getUser(m.userId)
            return (
              <div
                key={m.id}
                className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}
              >
                {!mine ? <Avatar user={u} size={28} /> : null}
                <div className={cn('max-w-[75%]', mine && 'items-end')}>
                  {!mine ? (
                    <p className="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">
                      {u.name.split(' ')[0]}
                    </p>
                  ) : null}
                  {editingId === m.id ? (
                    <div className="rounded-2xl rounded-br-md bg-primary p-2 text-left text-primary-foreground">
                      <input
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                        autoFocus
                        className="w-full rounded-xl bg-background/15 px-3 py-2 text-sm text-primary-foreground outline-none"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null)
                            setEditText('')
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-background/15 px-2.5 py-1 text-xs font-bold"
                        >
                          <X size={13} />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEdit(m.id)}
                          disabled={!editText.trim() || savingId === m.id}
                          className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-bold text-foreground disabled:opacity-50"
                        >
                          <Check size={13} />
                          {savingId === m.id ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2 text-sm',
                        mine
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md bg-card text-card-foreground ring-1 ring-border',
                      )}
                    >
                      {m.text || null}
                      {m.mediaPath ? <ChatMedia path={m.mediaPath} alt="Crew chat upload" /> : null}
                    </div>
                  )}
                  <div className={cn('mt-0.5 flex items-center gap-1 px-1', mine && 'justify-end')}>
                    <p className="text-[10px] text-muted-foreground">
                      {relativeMessageTime(m.createdAt)}
                    </p>
                    {mine && editingId !== m.id ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId((current) => current === m.id ? null : m.id)
                            setConfirmDeleteId(null)
                          }}
                          className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                          aria-label="Message actions"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {openMenuId === m.id ? (
                          <div className="absolute bottom-7 right-0 z-20 w-32 rounded-xl bg-card p-1 shadow-lg ring-1 ring-border">
                            {confirmDeleteId === m.id ? (
                              <div className="p-1">
                                <p className="px-1 pb-2 text-left text-[11px] font-semibold text-card-foreground">
                                  Delete message?
                                </p>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="flex-1 rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void removeMessage(m.id)}
                                    disabled={deletingId === m.id}
                                    className="flex-1 rounded-lg bg-destructive px-2 py-1 text-[10px] font-bold text-destructive-foreground disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(m.id)
                                    setEditText(m.text)
                                    setOpenMenuId(null)
                                    setActionError(null)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-card-foreground hover:bg-secondary"
                                >
                                  <Pencil size={13} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(m.id)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 size={13} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {actionError ? (
        <p className="shrink-0 bg-destructive/10 px-4 py-2 text-center text-xs font-semibold text-destructive">
          {actionError}
        </p>
      ) : null}

      {/* Composer */}
      <div className="flex shrink-0 items-end gap-2 border-t border-border bg-card/95 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
        <input ref={mediaInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={sendMedia} className="hidden" />
        <button type="button" onClick={() => mediaInputRef.current?.click()} disabled={uploading || !isPersistedChat} aria-label="Add photo" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary disabled:opacity-40"><ImagePlus size={19} /></button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !composingRef.current &&
              e.nativeEvent.keyCode !== 229
            ) {
              e.preventDefault()
              void submit()
            }
          }}
          placeholder="Message the crew…"
          className="min-w-0 flex-1 rounded-full bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!text.trim()}
          aria-label="Send"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground transition-transform active:scale-90 disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

