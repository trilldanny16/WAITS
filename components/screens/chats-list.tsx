'use client'

import { useMemo } from 'react'
import { MessageCircle, Globe, ChevronRight, Crown, Lock } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { WorkoutTypeIcon } from '../workout-type-icon'
import { formatTime, formatDateLabel, relativeMessageTime } from '@/lib/date-utils'
import { COMMUNITY_CHANNEL_ID } from '@/lib/seed'

export function ChatsList() {
  const { workouts, messages, getUser, hasJoined, currentUserId, isPremium } = useStore()
  const { openChat, openCommunity, openPaywall } = useNav()
  const openCrew = (id: string) => (isPremium ? openChat(id) : openPaywall('Crew chats'))

  const communityCount = useMemo(
    () => messages.filter((m) => m.workoutId === COMMUNITY_CHANNEL_ID).length,
    [messages],
  )

  const myWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => w.hostId === currentUserId || hasJoined(w))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [workouts, hasJoined, currentUserId],
  )

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-5 pb-2 pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Chats</h1>
        <p className="text-sm text-muted-foreground">The public community plus your crew chats.</p>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-3">
        {/* Public community channel — pinned entry point */}
        <button
          type="button"
          onClick={openCommunity}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-primary p-3.5 text-left text-primary-foreground shadow-md shadow-primary/25"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Globe size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">Waits Community</p>
            <p className="truncate text-xs text-primary-foreground/80">
              Public channel · {communityCount} posts
            </p>
          </div>
          <ChevronRight size={20} className="shrink-0 text-primary-foreground/70" />
        </button>

        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Crew Chats
        </p>

        {!isPremium && myWorkouts.length > 0 ? (
          <button
            type="button"
            onClick={() => openPaywall('Crew chats')}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-accent p-3.5 text-left text-accent-foreground"
          >
            <Crown size={20} className="shrink-0" />
            <span className="flex-1 text-xs font-semibold">
              Crew chats are a Waits Pro feature. Upgrade to message your workout groups.
            </span>
            <ChevronRight size={18} className="shrink-0 opacity-70" />
          </button>
        ) : null}

        {myWorkouts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-3xl bg-secondary text-muted-foreground">
              <MessageCircle size={30} />
            </span>
            <h2 className="mt-4 text-lg font-bold text-foreground">No active chats</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Join or post a workout and a chat opens automatically.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {myWorkouts.map((w) => {
              const host = getUser(w.hostId)
              const last = messages
                .filter((m) => m.workoutId === w.id)
                .sort((a, b) => b.createdAt - a.createdAt)[0]
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => openCrew(w.id)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-border"
                  >
                    <span className="relative">
                      <Avatar user={host} size={48} />
                      <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-lime text-lime-foreground ring-2 ring-card">
                        <WorkoutTypeIcon type={w.types[0]} size={12} />
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-card-foreground">
                        {w.types.join(' + ')} · {w.hostId === currentUserId ? 'You' : host.name.split(' ')[0]}
                      </p>
                      {isPremium ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {last ? (
                            <>
                              {last.userId === currentUserId
                                ? 'You: '
                                : `${getUser(last.userId).name.split(' ')[0]}: `}
                              {last.text}
                            </>
                          ) : (
                            `${formatDateLabel(w.date)} · ${formatTime(w.time)}`
                          )}
                        </p>
                      ) : (
                        <p className="flex items-center gap-1 truncate text-xs font-medium text-primary">
                          <Lock size={11} />
                          Unlock with Waits Pro
                        </p>
                      )}
                    </div>
                    {isPremium && last ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {relativeMessageTime(last.createdAt)}
                      </span>
                    ) : !isPremium ? (
                      <Crown size={16} className="shrink-0 text-primary" />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
