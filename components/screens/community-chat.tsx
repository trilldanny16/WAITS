'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Globe, Send, MapPin } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { relativeMessageTime } from '@/lib/date-utils'
import { COMMUNITY_CHANNEL_ID } from '@/lib/seed'
import { cn } from '@/lib/utils'

export function CommunityChat() {
  const { getUser, messagesFor, sendMessage, currentUserId, users } = useStore()
  const { back, openUser } = useNav()
  const [text, setText] = useState('')
  const composingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const messages = messagesFor(COMMUNITY_CHANNEL_ID)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])

  const submit = () => {
    if (!text.trim()) return
    sendMessage(COMMUNITY_CHANNEL_ID, text)
    setText('')
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header — bold primary banner to distinguish the public channel */}
      <header className="shrink-0 bg-primary px-3 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-primary-foreground">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            className="flex size-9 items-center justify-center rounded-full bg-white/15 text-primary-foreground"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <span className="flex size-10 items-center justify-center rounded-2xl bg-white/15">
            <Globe size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">Waits Community</p>
            <p className="truncate text-xs text-primary-foreground/75">
              {users.length} lifters · Public channel
            </p>
          </div>
        </div>
      </header>

      {/* Messages — full-width broadcast/forum rows (distinct from crew bubbles) */}
      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
        <div className="mx-auto mb-1 flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
          <Globe size={12} />
          Anyone in the community can post here
        </div>
        {messages.map((m) => {
          const u = getUser(m.userId)
          const mine = m.userId === currentUserId
          return (
            <article
              key={m.id}
              className={cn(
                'flex gap-3 rounded-2xl p-3 ring-1',
                mine
                  ? 'bg-accent/40 ring-accent'
                  : 'bg-card ring-border',
              )}
            >
              <button
                type="button"
                onClick={() => openUser(m.userId)}
                aria-label={`View ${u.name}'s profile`}
                className="shrink-0 self-start"
              >
                <Avatar user={u} size={40} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-bold text-card-foreground">
                    {mine ? 'You' : u.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {relativeMessageTime(m.createdAt)}
                  </span>
                </div>
                <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <MapPin size={10} />
                  {u.homeGym}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-card-foreground">{m.text}</p>
              </div>
            </article>
          )
        })}
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
          placeholder="Post to the community…"
          className="min-w-0 flex-1 rounded-full bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          aria-label="Post"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-90 disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
