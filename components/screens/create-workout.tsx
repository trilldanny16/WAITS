'use client'

import { useState } from 'react'
import { X, Minus, Plus, Globe, Lock, Check, Crown } from 'lucide-react'
import {
  useStore,
  FREE_MAX_PARTICIPANTS,
  PRO_MAX_PARTICIPANTS,
  FREE_MAX_ACTIVE_WORKOUTS,
} from '../store'
import { useNav } from '../navigation'
import { WorkoutTypeIcon } from '../workout-type-icon'
import { GymMapPicker, type GymLocation } from '../gym-map-picker'
import { GYMS, WORKOUT_CATEGORIES, type Visibility, type WorkoutType } from '@/lib/types'
import { todayISO, weekdayShort, formatTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'

function next7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

const QUICK_TIMES = ['06:00', '12:00', '17:00', '18:00', '19:00', '20:00', '21:00']

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  )
}

export function CreateWorkout() {
  const { createWorkout, isPremium, activeHostedCount, pushToast } = useStore()
  const { back, openWorkout, openPaywall } = useNav()

  const participantCap = isPremium ? PRO_MAX_PARTICIPANTS : FREE_MAX_PARTICIPANTS
  const atWorkoutLimit = !isPremium && activeHostedCount >= FREE_MAX_ACTIVE_WORKOUTS

  const days = next7Days()
  const [gym, setGym] = useState(GYMS[0])
  const [location, setLocation] = useState<GymLocation | null>(null)
  const [date, setDate] = useState(todayISO())

  const selectPreset = (g: string) => {
    setGym(g)
    setLocation(null)
  }

  const selectLocation = (loc: GymLocation) => {
    setLocation(loc)
    setGym(loc.name)
  }
  const [time, setTime] = useState('19:00')
  const [types, setTypes] = useState<WorkoutType[]>(['Legs'])
  const [notes, setNotes] = useState('')

  const toggleType = (t: WorkoutType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  const [maxParticipants, setMax] = useState(3)
  const [visibility, setVisibility] = useState<Visibility>('friends')
  const [recurring, setRecurring] = useState<'none' | 'daily' | 'weekly'>('none')

  const handleCreate = () => {
    if (types.length === 0) return
    if (atWorkoutLimit) {
      openPaywall('Unlimited workouts')
      return
    }
    const w = createWorkout({
      gym,
      city: location?.city || 'Boynton Beach',
      lat: location?.lat,
      lng: location?.lng,
      date,
      time,
      types,
      notes,
      maxParticipants,
      visibility,
      recurring,
    })
    back()
    openWorkout(w.id)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
        <button
          type="button"
          onClick={back}
          className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <h1 className="text-base font-bold text-foreground">New Workout</h1>
        <div className="w-9" />
      </header>

      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto p-5">
        {/* Gym */}
        <div>
          <FieldLabel>Gym</FieldLabel>
          <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
            {GYMS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => selectPreset(g)}
                className={cn(
                  'shrink-0 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors',
                  gym === g && !location
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-card-foreground ring-1 ring-border',
                )}
              >
                {g}
              </button>
            ))}
          </div>
          <GymMapPicker value={location} onChange={selectLocation} />
        </div>

        {/* Date */}
        <div>
          <FieldLabel>Date</FieldLabel>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const active = d === date
              const dayNum = Number.parseInt(d.slice(8), 10)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDate(d)}
                  className={cn(
                    'flex flex-col items-center rounded-2xl py-2.5 transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-card-foreground ring-1 ring-border',
                  )}
                >
                  <span className="text-[10px] font-medium uppercase opacity-70">
                    {weekdayShort(d)}
                  </span>
                  <span className="text-base font-bold">{dayNum}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time */}
        <div>
          <FieldLabel>Time</FieldLabel>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {QUICK_TIMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={cn(
                  'shrink-0 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors',
                  time === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-card-foreground ring-1 ring-border',
                )}
              >
                {formatTime(t)}
              </button>
            ))}
            <label className="flex shrink-0 items-center rounded-2xl bg-card px-3 text-sm font-semibold text-card-foreground ring-1 ring-border">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-transparent outline-none"
                aria-label="Custom time"
              />
            </label>
          </div>
        </div>

        {/* Type */}
        <div>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Workout Type
            </h3>
            <span className="text-xs font-medium text-muted-foreground">
              {types.length > 0 ? `${types.length} selected` : 'Pick one or more'}
            </span>
          </div>
          <div className="space-y-4">
            {WORKOUT_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <p className="mb-1.5 px-1 text-xs font-semibold text-foreground/70">
                  {cat.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cat.types.map((t) => {
                    const active = types.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleType(t)}
                        aria-pressed={active}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
                          active
                            ? 'bg-lime text-lime-foreground'
                            : 'bg-card text-card-foreground ring-1 ring-border',
                        )}
                      >
                        <WorkoutTypeIcon type={t} size={14} />
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Max participants */}
        <div>
          <FieldLabel>Max Participants</FieldLabel>
          <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
            <span className="text-sm font-medium text-muted-foreground">
              Keep it small &amp; efficient
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMax((m) => Math.max(2, m - 1))}
                className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-40"
                disabled={maxParticipants <= 2}
                aria-label="Decrease"
              >
                <Minus size={16} />
              </button>
              <span className="w-6 text-center text-lg font-bold text-card-foreground">
                {maxParticipants}
              </span>
              <button
                type="button"
                onClick={() => setMax((m) => Math.min(participantCap, m + 1))}
                className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-40"
                disabled={maxParticipants >= participantCap}
                aria-label="Increase"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          {!isPremium ? (
            <button
              type="button"
              onClick={() => openPaywall('Bigger groups')}
              className="mt-2 flex w-full items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-left text-xs font-semibold text-accent-foreground"
            >
              <Crown size={14} className="shrink-0" />
              Free plan caps groups at {FREE_MAX_PARTICIPANTS}. Go Pro for up to {PRO_MAX_PARTICIPANTS}.
            </button>
          ) : null}
        </div>

        {/* Visibility */}
        <div>
          <FieldLabel>Visibility</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { v: 'friends', label: 'Friends Only', icon: Lock },
                { v: 'public', label: 'Public', icon: Globe },
              ] as const
            ).map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-colors',
                  visibility === v
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-card-foreground ring-1 ring-border',
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Recurring */}
        <div>
          <FieldLabel>Repeat</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { v: 'none', label: 'Once' },
                { v: 'daily', label: 'Daily' },
                { v: 'weekly', label: 'Weekly' },
              ] as const
            ).map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => setRecurring(v)}
                className={cn(
                  'rounded-2xl py-3 text-sm font-semibold transition-colors',
                  recurring === v
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-card-foreground ring-1 ring-border',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add details — split, parking, meeting spot…"
            rows={3}
            className="w-full resize-none rounded-2xl bg-card p-4 text-sm text-card-foreground outline-none ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="shrink-0 border-t border-border bg-card/95 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
        <button
          type="button"
          onClick={handleCreate}
          disabled={types.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime py-4 text-base font-extrabold text-lime-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <Check size={20} strokeWidth={3} />
          Post Workout
        </button>
      </div>
    </div>
  )
}
