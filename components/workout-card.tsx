'use client'

import { useState } from 'react'
import { MapPin, Clock, Users } from 'lucide-react'
import type { Workout } from '@/lib/types'
import { useStore } from './store'
import { useNav } from './navigation'
import { Avatar } from './avatar'
import { WorkoutTypeIcon } from './workout-type-icon'
import { formatDateLabel, formatTime, todayISO } from '@/lib/date-utils'
import { cn } from '@/lib/utils'

export function WorkoutCard({
  workout,
  showLocationDetails = false,
}: {
  workout: Workout
  showLocationDetails?: boolean
}) {
  const { getUser, isFull, hasJoined, joinWorkout, leaveWorkout, currentUserId } = useStore()
  const [changingAttendance, setChangingAttendance] = useState(false)
  const { openWorkout, openUser } = useNav()

  const host = getUser(workout.hostId)
  const full = isFull(workout)
  const joined = hasJoined(workout)
  const spotsLeft = workout.maxParticipants - workout.attendees.length
  const isHost = workout.hostId === currentUserId
  const futureWorkout = workout.date !== todayISO()
  const visibilityLabel = workout.visibility === 'friends' ? 'Friends' : 'Public'
  const dateLabel = futureWorkout ? formatDateLabel(workout.date) : null
  const locationLabel = workout.address.toLowerCase().includes(workout.city.toLowerCase())
    ? workout.address
    : `${workout.address}, ${workout.city}`

  return (
    <article className="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border">
      <button
        type="button"
        onClick={() => openWorkout(workout.id)}
        className="block w-full text-left"
      >
        <div className="flex items-start gap-4 px-4 pt-4">
          <div className="flex-1">
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
                {showLocationDetails ? (
                  <p className="mt-1 truncate pl-4 text-[11px] text-muted-foreground">
                    {locationLabel}
                  </p>
                ) : null}
              </div>
            </div>

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
            </div>
          </div>

          <div className="flex w-36 flex-col items-end gap-3">
            <span className="flex items-center gap-1 text-sm font-bold text-card-foreground">
              <Clock size={13} className="text-muted-foreground" />
              {formatTime(workout.time)}
            </span>
            {dateLabel ? (
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {dateLabel}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Users size={14} className="text-muted-foreground" />
              {workout.attendees.length}/{workout.maxParticipants}
            </span>
            {!futureWorkout ? (
              <span className="inline-flex rounded-full bg-secondary px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-black">
                {visibilityLabel}
              </span>
            ) : null}
          </div>
        </div>
      </button>

      <div className="px-4 pb-4">
        <div className={cn('mt-2 w-full', futureWorkout && 'grid grid-cols-[2fr_1fr] items-stretch gap-2')}>
          {isHost ? (
            <span className="block w-full rounded-full bg-secondary px-4 py-2.5 text-center text-xs font-bold uppercase text-secondary-foreground">
              YOUR WORKOUT
            </span>
          ) : joined ? (
            <button
              type="button"
              disabled={changingAttendance}
              onClick={async () => {
                setChangingAttendance(true)
                await leaveWorkout(workout.id)
                setChangingAttendance(false)
              }}
              className="block w-full rounded-full bg-accent px-4 py-2.5 text-center text-xs font-bold uppercase text-accent-foreground transition-transform active:scale-95 disabled:opacity-50"
            >
              {changingAttendance ? 'Leaving…' : 'Leave'}
            </button>
          ) : full ? (
            <span className="block w-full rounded-full bg-destructive/15 px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wide text-destructive">
              Full
            </span>
          ) : (
            <button
              type="button"
              disabled={changingAttendance}
              onClick={async () => {
                setChangingAttendance(true)
                await joinWorkout(workout.id)
                setChangingAttendance(false)
              }}
              className="block w-full rounded-full bg-lime px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-lime-foreground shadow-sm transition-transform active:scale-95"
            >
              {changingAttendance ? 'Joining…' : workout.date > todayISO() ? 'Lock Me In!' : 'Wait Up!'}
            </button>
          )}
          {futureWorkout ? (
            <span className="flex min-w-0 items-center justify-center rounded-full bg-secondary px-2 py-2.5 text-center text-xs font-extrabold uppercase tracking-wide text-black">
              {visibilityLabel}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

