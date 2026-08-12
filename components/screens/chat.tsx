'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronLeft,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { formatTime, formatDateLabel, relativeMessageTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase-client'
import { isPersistedWorkoutId } from '@/lib/workout-identity'

interface CrewMessage {
  id: string
  workoutId: string
  userId: string
  text: string
  createdAt: number
  updatedAt: number | null
}

interface CrewMessageRow {
  id: string
  workout_id: string
  user_id: string
  text: string
  created_at: string
  updated_at: string | null
}

const toCrewMessage = (row: CrewMessageRow): CrewMessage => ({
  id: row.id,
  workoutId: row.workout_id,
  userId: row.user_id,
  text: row.text,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null,
})

export function Chat({ id }: { id: string }) {
  const { workouts, getUser, currentUserId, pushToast } = useStore()
  const { back } = useNav()
  const [messages, setMessages] = useState<CrewMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const composingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const workout = workouts.find((workout) => workout.id === id)
  const persistedWorkout = isPersistedWorkoutId(id)

  const loadMessages = useCallback(async () => {
    if (!persistedWorkout) {
      setMessages([])
      setMessageError('Crew Chat is available only for live workouts.')
      setLoading(false)
      return false
    }

    const { data, error } = await supabase
      .from('crew_messages')
      .select('id, workout_id, user_id, text, created_at, updated_at')
      .eq('workout_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load Crew Chat messages:', error)
      setMessageError(error.message)
      setLoading(false)
      return false
    }

    setMessages(((data ?? []) as CrewMessageRow[]).map(toCrewMessage))
    setMessageError(null)
    setLoading(false)
    return true
  }, [id, persistedWorkout])

  useEffect(() => {
    if (!persistedWorkout) return

    void loadMessages()

    const channel = supabase
      .channel(`crew-messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crew_messages',
          filter: `workout_id=eq.${id}`,
        },
        () => void loadMessages(),
      )
      .subscribe()

    const refreshOnFocus = () => void loadMessages()
    window.addEventListener('focus', refreshOnFocus)

    return () => {
      window.removeEventListener('focus', refreshOnFocus)
      void supabase.removeChannel(channel)
    }
  }, [id, loadMessages, persistedWorkout])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: loading ? 'auto' : 'smooth',
    })
  }, [loading, messages.length])

  if (!workout || !persistedWorkout) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">{!workout ? 'This chat is no longer available.' : 'Crew Chat is available only for live workouts.'}</p>
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

  const showError = (title: string, error: string) => {
    setMessageError(error)
    pushToast({ title, body: error })
  }

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setSending(true)
    setMessageError(null)
    const { error } = await supabase
      .from('crew_messages')
      .insert({ workout_id: id, user_id: currentUserId, text: trimmed })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to send Crew Chat message:', error)
      showError('Message was not sent', error.message)
      setSending(false)
      return
    }

    setText('')
    await loadMessages()
    setSending(false)
  }

  const startEditing = (message: CrewMessage) => {
    setEditingId(message.id)
    setEditText(message.text)
    setOpenMenuId(null)
    setConfirmDeleteId(null)
    setMessageError(null)
  }

  const saveEdit = async (messageId: string) => {
    const trimmed = editText.trim()
    if (!trimmed || savingId) return

    setSavingId(messageId)
    setMessageError(null)
    const { data, error } = await supabase
      .from('crew_messages')
      .update({ text: trimmed, updated_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('user_id', currentUserId)
      .select('id')

    if (error || !data?.length) {
      const detail = error?.message ?? 'Supabase did not confirm the edit.'
      console.error('Failed to edit Crew Chat message:', error)
      showError('Message was not updated', detail)
      setSavingId(null)
      return
    }

    await loadMessages()
    setEditingId(null)
    setEditText('')
    setSavingId(null)
  }

  const deleteMessage = async (messageId: string) => {
    if (deletingId) return

    setDeletingId(messageId)
    setMessageError(null)
    const { data, error } = await supabase
      .from('crew_messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', currentUserId)
      .select('id')

    if (error || !data?.length) {
      const detail = error?.message ?? 'Supabase did not confirm the deletion.'
      console.error('Failed to delete Crew Chat message:', error)
      showError('Message was not deleted', detail)
      setDeletingId(null)
      return
    }

    await loadMessages()
    setConfirmDeleteId(null)
    setOpenMenuId(null)
    setDeletingId(null)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="z-10 flex shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)] backdrop-blur">
        <button
          type="button"
          onClick={back}
          className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-extrabold text-foreground">
            {workout.types.join(' + ')}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <Users size={13} />
            {host.name.split(' ')[0]}&apos;s crew · {workout.attendees.length} members · {formatTime(workout.time)}
          </p>
        </div>
        <div className="flex -space-x-2">
          {workout.attendees.slice(0, 3).map((attendeeId) => (
            <Avatar
              key={attendeeId}
              user={getUser(attendeeId)}
              size={32}
              className="ring-2 ring-background"
            />
          ))}
        </div>
      </header>

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        <p className="mx-auto w-fit rounded-full bg-secondary px-3.5 py-1.5 text-[11px] font-semibold text-muted-foreground">
          {formatDateLabel(workout.date)} · Participants only
        </p>

        {loading ? (
          <p className="pt-8 text-center text-sm text-muted-foreground">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="px-5 pt-8 text-center text-sm leading-6 text-muted-foreground">
            Say hey — coordinate parking, timing, or what you&apos;re training.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.userId === currentUserId
            const sender = getUser(message.userId)
            const isEditing = editingId === message.id
            const isConfirmingDelete = confirmDeleteId === message.id

            return (
              <div
                key={message.id}
                className={cn('group flex items-end gap-2.5', mine && 'flex-row-reverse')}
              >
                {!mine ? <Avatar user={sender} size={34} className="mb-5 shrink-0" /> : null}
                <div className={cn('relative max-w-[82%] sm:max-w-[72%]', mine && 'text-right')}>
                  {!mine ? (
                    <p className="mb-1 px-1 text-xs font-bold text-foreground">
                      {sender.name}
                    </p>
                  ) : null}

                  {isEditing ? (
                    <div className="rounded-3xl rounded-br-md bg-primary p-2 text-left text-primary-foreground">
                      <textarea
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                        rows={2}
                        autoFocus
                        className="w-full resize-none rounded-2xl bg-background/15 px-3 py-2.5 text-[15px] leading-6 text-primary-foreground outline-none placeholder:text-primary-foreground/60"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null)
                            setEditText('')
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-background/15 px-3 py-1.5 text-xs font-bold"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEdit(message.id)}
                          disabled={!editText.trim() || savingId === message.id}
                          className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1.5 text-xs font-bold text-foreground disabled:opacity-50"
                        >
                          <Check size={14} />
                          {savingId === message.id ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'whitespace-pre-wrap break-words rounded-3xl px-4 py-3 text-left text-[15px] leading-6 shadow-sm',
                        mine
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md bg-card text-card-foreground ring-1 ring-border',
                      )}
                    >
                      {message.text}
                    </div>
                  )}

                  <div
                    className={cn(
                      'mt-1 flex items-center gap-1.5 px-1 text-[10px] font-medium text-muted-foreground',
                      mine && 'justify-end',
                    )}
                  >
                    <span>{relativeMessageTime(message.createdAt)}</span>
                    {message.updatedAt ? <span>· Edited</span> : null}
                  </div>

                  {mine && !isEditing ? (
                    <div className="absolute -left-9 top-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId((openId) => openId === message.id ? null : message.id)
                          setConfirmDeleteId(null)
                        }}
                        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        aria-label="Message actions"
                        aria-expanded={openMenuId === message.id}
                      >
                        <MoreHorizontal size={17} />
                      </button>

                      {openMenuId === message.id ? (
                        <div className="absolute bottom-9 right-0 z-20 w-36 overflow-hidden rounded-2xl bg-card p-1.5 text-left shadow-xl ring-1 ring-border">
                          {!isConfirmingDelete ? (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditing(message)}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-card-foreground hover:bg-secondary"
                              >
                                <Pencil size={15} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(message.id)}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 size={15} />
                                Delete
                              </button>
                            </>
                          ) : (
                            <div className="p-1">
                              <p className="px-2 pb-2 text-xs font-semibold text-card-foreground">
                                Delete this message?
                              </p>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="flex-1 rounded-lg bg-secondary px-2 py-1.5 text-xs font-bold text-secondary-foreground"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteMessage(message.id)}
                                  disabled={deletingId === message.id}
                                  className="flex-1 rounded-lg bg-destructive px-2 py-1.5 text-xs font-bold text-destructive-foreground disabled:opacity-50"
                                >
                                  {deletingId === message.id ? 'Deleting…' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur sm:px-6">
        {messageError ? (
          <p className="mb-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
            {messageError}
          </p>
        ) : null}
        <div className="flex items-end gap-2.5">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onCompositionStart={() => (composingRef.current = true)}
            onCompositionEnd={() => (composingRef.current = false)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !composingRef.current &&
                event.nativeEvent.keyCode !== 229
              ) {
                event.preventDefault()
                void submit()
              }
            }}
            rows={1}
            placeholder="Message the crew…"
            className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-3xl bg-secondary px-4 py-3 text-[15px] leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!text.trim() || sending}
            aria-label="Send"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground transition-transform active:scale-90 disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
