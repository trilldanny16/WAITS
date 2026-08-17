'use client'

import { useMemo } from 'react'
import { Crown, Flame, CalendarDays } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { WorkoutCard } from '../workout-card'
import { Avatar } from '../avatar'
import { Wordmark } from '../wordmark'
import { relativeBucket, timeToMinutes } from '@/lib/date-utils'
import type { Workout } from '@/lib/types'

function greeting(): string {
  const choices = [
    'Ready to move',
    'Let’s get after it',
    'Time to train',
    'Your next session awaits',
  ]
  return choices[Math.floor(Math.random() * choices.length)]
}

function Section({
  title,
  accent,
  workouts,
}: {
  title: string
  accent?: boolean
  workouts: Workout[]
}) {
  if (workouts.length === 0) return null
  return (
    <section className="mt-6 first:mt-2">
      <h2 className="mb-3 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {accent ? <Flame size={14} className="text-lime-foreground" /> : null}
        {title}
      </h2>
      <div className="space-y-3">
        {workouts.map((w) => (
          <WorkoutCard key={w.id} workout={w} />
        ))}
      </div>
    </section>
  )
}

export function HomeFeed() {
  const { workouts, getUser, currentUserId, isPremium } = useStore()
  const { openUser } = useNav()
  const me = getUser(currentUserId)

  const { today, week } = useMemo(() => {
    const sorted = [...workouts].sort(
      (a, b) =>
        a.date.localeCompare(b.date) || timeToMinutes(a.time) - timeToMinutes(b.time),
    )
    return {
      today: sorted.filter((w) => ['today', 'tonight'].includes(relativeBucket(w.date, w.time))),
      week: sorted.filter((w) => relativeBucket(w.date, w.time) === 'week'),
    }
  }, [workouts])

  const empty = today.length + week.length === 0

  // friends training this week, for the top rail
  const railUsers = useMemo(() => {
    const ids = new Set<string>()
    for (const w of workouts) {
      if (w.hostId !== currentUserId) ids.add(w.hostId)
    }
    return [...ids].map(getUser)
  }, [workouts, getUser, currentUserId])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="shrink-0 px-5 pb-2 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="flex items-center justify-between">
          <Wordmark iconSize={18} className="text-lg text-primary" />
          {isPremium ? (
            <button
              type="button"
              onClick={() => openUser(currentUserId)}
              aria-label="Open Pro profile"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-primary-foreground shadow-sm"
            >
              <Crown size={15} fill="currentColor" />
              Pro
            </button>
          ) : null}
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {greeting()}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {me.name.split(' ')[0]}
          </h1>
        </div>

        {/* Friends rail */}
        <div className="no-scrollbar -mx-5 mt-4 flex gap-4 overflow-x-auto px-5 pb-1">
          {railUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => openUser(u.id)}
              className="flex w-14 shrink-0 flex-col items-center gap-1"
            >
              <Avatar user={u} size={52} ring />
              <span className="w-full truncate text-center text-[11px] font-medium text-muted-foreground">
                {u.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Feed */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        {empty ? (
          <EmptyFeed />
        ) : (
          <>
            <Section title="Today" workouts={today} />
            <Section title="This Week" workouts={week} />
          </>
        )}
      </div>
    </div>
  )
}

function EmptyFeed() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-secondary text-muted-foreground">
        <CalendarDays size={30} />
      </span>
      <h2 className="mt-4 text-lg font-bold text-foreground">No workouts yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Follow friends or post your own workout to get the feed going.
      </p>
    </div>
  )
}
