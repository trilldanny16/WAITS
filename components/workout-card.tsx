'use client'

import { MapPin, Clock, Check, Users, Lock } from 'lucide-react'
import type { Workout } from '@/lib/types'
import { useStore } from './store'
import { useNav } from './navigation'
import { Avatar } from './avatar'
import { WorkoutTypeIcon } from './workout-type-icon'
import { formatTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'

export function WorkoutCard({ workout }: { workout: Workout }) {
  const { getUser, isFull, hasJoined, joinWorkout } = useStore()
  const { openWorkout, openUser } = useNav()

  const host = getUser(workout.hostId)
  const full = isFull(workout)
  const joined = hasJoined(workout)
  const spotsLeft = workout.maxParticipants - workout.attendees.length
  const isHost = workout.hostId === 'u_danny'

  return (
    <article className="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border">
      <button
        type="button"
        onClick={() => openWorkout(workout.id)}
        className="block w-full px-4 pt-4 text-left"
      >
        {/* Header row */}
        <div className="flex items-center gap-3">
          <span
            onClick={(e) => {
              e.stopPropagation()
              openUser(host.id)
            }}
          >
            <Avatar user={host} size={46} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-card-foreground">
              {isHost ? 'You' : host.name}
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin size={12} />
              {workout.gym}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1 text-sm font-bold text-card-foreground">
              <Clock size={13} className="text-muted-foreground" />
              {formatTime(workout.time)}
            </span>
            {workout.visibility === 'friends' ? (
              <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <Lock size={9} /> Friends
              </span>
            ) : (
              <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                Public
              </span>
            )}
          </div>
        </div>

        {/* Type + notes */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {workout.types.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground"
            >
              <WorkoutTypeIcon type={t} size={14} />
              {t}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Users size={13} />
            {workout.attendees.length}/{workout.maxParticipants}
          </span>
        </div>
      </button>

      {/* Footer / CTA */}
      <div className="mt-3 flex items-center gap-3 px-4 pb-4">
        <div className="flex -space-x-2">
          {workout.attendees.slice(0, 3).map((a) => (
            <Avatar
              key={a}
              user={getUser(a)}
              size={28}
              className="ring-2 ring-card"
            />
          ))}
        </div>
        <span
          className={cn(
            'text-xs font-semibold',
            full ? 'text-muted-foreground' : 'text-card-foreground',
          )}
        >
          {full
            ? 'Workout full'
            : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
        </span>

        <div className="ml-auto">
          {isHost ? (
            <span className="rounded-full bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground">
              Your workout
            </span>
          ) : joined ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground">
              <Check size={15} strokeWidth={3} /> Going
            </span>
          ) : full ? (
            <span className="rounded-full bg-destructive/15 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-destructive">
              Full
            </span>
          ) : (
            <button
              type="button"
              onClick={() => joinWorkout(workout.id)}
              className="rounded-full bg-lime px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-lime-foreground shadow-sm transition-transform active:scale-95"
            >
              Come Thru
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
