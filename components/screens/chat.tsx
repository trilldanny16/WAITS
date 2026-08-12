'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Send, Users } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { formatTime, formatDateLabel, relativeMessageTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'

export function Chat({ id }: { id: string }) {
  const { workouts, getUser, messagesFor, sendMessage, currentUserId } = useStore()
  const { back } = useNav()
  const [text, setText] = useState('')
  const composingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const workout = workouts.find((w) => w.id === id)
  const messages = messagesFor(id)

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

  const submit = () => {
    if (!text.trim()) return
    sendMessage(id, text)
    setText('')
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
        <button
          type="button"
          onClick={back}
          className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            {workout.types.join(' + ')} · {host.name.split(' ')[0]}&apos;s crew
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Users size={11} />
            {workout.attendees.length} in chat · {formatTime(workout.time)}
          </p>
        </div>
        <div className="flex -space-x-2">
          {workout.attendees.slice(0, 3).map((a) => (
            <Avatar key={a} user={getUser(a)} size={30} className="ring-2 ring-background" />
          ))}
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
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2 text-sm',
                      mine
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md bg-card text-card-foreground ring-1 ring-border',
                    )}
                  >
                    {m.text}
                  </div>
                  <p
                    className={cn(
                      'mt-0.5 px-1 text-[10px] text-muted-foreground',
                      mine && 'text-right',
                    )}
                  >
                    {relativeMessageTime(m.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Composer */}
      <div className="flex shrink-0 items-end gap-2 border-t border-border bg-card/95 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
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
              submit()
            }
          }}
          placeholder="Message the crew…"
          className="min-w-0 flex-1 rounded-full bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={submit}
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
