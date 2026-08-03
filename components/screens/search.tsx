'use client'

import { useMemo, useState } from 'react'
import { Search as SearchIcon, X } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { WorkoutCard } from '../workout-card'
import { Avatar } from '../avatar'
import { WORKOUT_TYPES, type WorkoutType } from '@/lib/types'
import { cn } from '@/lib/utils'

type Filter = 'all' | WorkoutType

export function Search() {
  const { workouts, users, getUser, currentUserId } = useStore()
  const { openUser } = useNav()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const q = query.trim().toLowerCase()

  const matchedUsers = useMemo(() => {
    if (!q) return []
    return users.filter(
      (u) =>
        u.id !== currentUserId &&
        (u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.homeGym.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q)),
    )
  }, [q, users, currentUserId])

  const matchedWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      if (filter !== 'all' && !w.types.includes(filter)) return false
      if (!q) return true
      const host = getUser(w.hostId)
      return (
        w.gym.toLowerCase().includes(q) ||
        w.city.toLowerCase().includes(q) ||
        w.types.some((t) => t.toLowerCase().includes(q)) ||
        host.name.toLowerCase().includes(q) ||
        host.username.toLowerCase().includes(q)
      )
    })
  }, [workouts, filter, q, getUser])

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-foreground">Discover</h1>
        <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
          <SearchIcon size={18} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gym, friend, workout, or city"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={18} className="text-muted-foreground" />
            </button>
          ) : null}
        </div>

        {/* Type filters */}
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {(['all', ...WORKOUT_TYPES] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-card-foreground ring-1 ring-border',
              )}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        {matchedUsers.length > 0 ? (
          <section className="mb-5">
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              People
            </h2>
            <div className="space-y-2">
              {matchedUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => openUser(u.id)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-border"
                >
                  <Avatar user={u} size={42} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-card-foreground">
                      {u.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{u.username} · {u.homeGym}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {matchedWorkouts.length} Workout{matchedWorkouts.length === 1 ? '' : 's'}
        </h2>
        {matchedWorkouts.length === 0 ? (
          <p className="pt-6 text-center text-sm text-muted-foreground">
            No workouts match your search.
          </p>
        ) : (
          <div className="space-y-3">
            {matchedWorkouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
