'use client'

import {
  ChevronLeft,
  MapPin,
  Clock,
  Calendar,
  Users,
  MessageCircle,
  Check,
  Repeat,
  Trash2,
  Navigation,
  Lock,
  Crown,
} from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { WorkoutTypeIcon } from '../workout-type-icon'
import { formatTime, formatDateLabel } from '@/lib/date-utils'
import { cn } from '@/lib/utils'

function getDirectionsUrl(lat: number, lng: number) {
  const destination = `${lat},${lng}`
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)
  return isIOS
    ? `https://maps.apple.com/?daddr=${destination}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}

export function WorkoutDetail({ id }: { id: string }) {
  const { workouts, getUser, isFull, hasJoined, joinWorkout, leaveWorkout, cancelWorkout, isPremium, currentUserId } =
    useStore()
  const { back, openChat, openUser, openPaywall } = useNav()

  const workout = workouts.find((w) => w.id === id)
  if (!workout) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">This workout is no longer available.</p>
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
  const isHost = workout.hostId === currentUserId
  const joined = hasJoined(workout)
  const full = isFull(workout)
  const spotsLeft = workout.maxParticipants - workout.attendees.length
  const canChat = joined || isHost

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-2 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
        <button
          type="button"
          onClick={back}
          className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="text-base font-bold text-foreground">Workout</span>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-4">
        {/* Type banner */}
        <div className="flex items-center gap-3 rounded-3xl bg-primary p-5 text-primary-foreground">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15">
            <WorkoutTypeIcon type={workout.types[0]} size={28} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
              {workout.types.join(' + ')}
            </p>
            <p className="text-2xl font-extrabold leading-tight">{formatTime(workout.time)}</p>
          </div>
          {full ? (
            <span className="ml-auto rounded-full bg-lime px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-lime-foreground">
              Full
            </span>
          ) : (
            <span className="ml-auto text-sm font-bold">
              {spotsLeft} spot{spotsLeft === 1 ? '' : 's'} left
            </span>
          )}
        </div>

        {/* Host */}
        <button
          type="button"
          onClick={() => openUser(host.id)}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-border"
        >
          <Avatar user={host} size={44} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-card-foreground">
              {isHost ? 'You' : host.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">Hosting · @{host.username}</p>
          </div>
        </button>

        {/* Meta rows */}
        <div className="mt-3 space-y-2.5 rounded-2xl bg-card p-4 ring-1 ring-border">
          <Row icon={MapPin} label={workout.gym} sub={workout.address ?? workout.city} />
          <Row icon={Calendar} label={formatDateLabel(workout.date)} />
          <Row icon={Clock} label={formatTime(workout.time)} />
          <Row
            icon={Users}
            label={`${workout.attendees.length} of ${workout.maxParticipants} joined`}
          />
          {workout.recurring !== 'none' ? (
            <Row
              icon={Repeat}
              label={`Repeats ${workout.recurring}`}
            />
          ) : null}
        </div>

        {workout.notes && canChat ? (
          <div className="mt-3 rounded-2xl bg-card p-4 ring-1 ring-border">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Notes
            </p>
            <p className="text-sm text-card-foreground">{workout.notes}</p>
          </div>
        ) : workout.notes ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
            <Lock size={15} />
            Come thru to see the host&apos;s notes for this workout.
          </div>
        ) : null}

        {/* Attendees */}
        <div className="mt-3">
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Who&apos;s coming
          </p>
          <div className="flex flex-wrap gap-3">
            {workout.attendees.map((a) => {
              const u = getUser(a)
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => openUser(a)}
                  className="flex w-16 flex-col items-center gap-1"
                >
                  <Avatar user={u} size={48} />
                  <span className="w-full truncate text-center text-[11px] font-medium text-muted-foreground">
                    {a === currentUserId ? 'You' : u.name.split(' ')[0]}
                  </span>
                </button>
              )
            })}
            {Array.from({ length: spotsLeft }).map((_, i) => (
              <div key={i} className="flex w-16 flex-col items-center gap-1">
                <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground">
                  <Users size={18} />
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">Open</span>
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <button
            type="button"
            onClick={() => {
              void cancelWorkout(workout.id).then((canceled) => {
                if (canceled) back()
              })
            }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-3 text-sm font-bold text-destructive"
          >
            <Trash2 size={16} />
            Cancel Workout
          </button>
        ) : null}
      </div>

      {/* Sticky actions */}
      <div className="shrink-0 border-t border-border bg-card/95 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
        <div className="flex gap-3">
          {canChat ? (
            isPremium ? (
              <button
                type="button"
                onClick={() => openChat(workout.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary py-4 text-sm font-bold text-secondary-foreground"
              >
                <MessageCircle size={18} />
                Open Chat
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openPaywall('Crew chats')}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary py-4 text-sm font-bold text-secondary-foreground"
              >
                <Crown size={16} className="text-primary" />
                Chat · Pro
              </button>
            )
          ) : null}

          {isHost ? null : joined ? (
            <button
              type="button"
              onClick={() => void leaveWorkout(workout.id)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border py-4 text-sm font-bold text-foreground"
            >
              Leave
            </button>
          ) : full ? (
            <span className="flex flex-1 items-center justify-center rounded-2xl bg-destructive/10 py-4 text-sm font-extrabold uppercase tracking-wide text-destructive">
              Full
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void joinWorkout(workout.id)}
              className="flex flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-lime py-4 text-sm font-extrabold uppercase tracking-wide text-lime-foreground transition-transform active:scale-[0.98]"
            >
              Come Thru
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  sub,
}: {
  icon: typeof MapPin
  label: string
  sub?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon size={16} />
      </span>
      <div>
        <p className="text-sm font-semibold text-card-foreground">{label}</p>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  )
}
