'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Minus, Plus, Globe, Lock, Check, Crown } from 'lucide-react'
import {
  useStore,
  FREE_MAX_PARTICIPANTS,
  FREE_MAX_ACTIVE_WORKOUTS,
} from '../store'
import { todayISO, weekdayShort, formatTime, timeToMinutes } from '@/lib/date-utils'
import { useNav } from '../navigation'
import { WorkoutTypeIcon } from '../workout-type-icon'
import { GYMS, WORKOUT_CATEGORIES, type Visibility, type WorkoutType } from '@/lib/types'

import { cn } from '@/lib/utils'

function next7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function timeToHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [h, m] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m + minutesToAdd, 0, 0)
  return timeToHHMM(date)
}

function roundUpToNextHalfHour(date: Date): Date {
  const result = new Date(date)
  result.setSeconds(0)
  result.setMilliseconds(0)
  const minutes = result.getMinutes()
  if (minutes === 0 || minutes === 30) return result
  if (minutes < 30) {
    result.setMinutes(30)
  } else {
    result.setHours(result.getHours() + 1)
    result.setMinutes(0)
  }
  return result
}

function getEarliestBookingTime(now: Date): string {
  const nextSlot = roundUpToNextHalfHour(now)
  const diffMinutes = (nextSlot.getTime() - now.getTime()) / 60000
  if (diffMinutes >= 30) {
    return timeToHHMM(nextSlot)
  }
  const laterSlot = new Date(nextSlot)
  laterSlot.setMinutes(nextSlot.getMinutes() + 30)
  return timeToHHMM(laterSlot)
}

function generateHalfHourTimes(): string[] {
  const times: string[] = []
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  for (let i = 0; i < 48; i += 1) {
    times.push(timeToHHMM(date))
    date.setMinutes(date.getMinutes() + 30)
  }
  return times
}

const ALL_HALF_HOUR_TIMES = generateHalfHourTimes()

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

  const participantCap = isPremium ? Number.POSITIVE_INFINITY : FREE_MAX_PARTICIPANTS
  const atWorkoutLimit = !isPremium && activeHostedCount >= FREE_MAX_ACTIVE_WORKOUTS

  const days = next7Days()
  const [gymName, setGymName] = useState('')
  const [showGymNameDropdown, setShowGymNameDropdown] = useState(false)
  const gymNameOptions = Array.from(new Set(GYMS.map((g) => g.name)))
  const gymNameSuggestions = gymNameOptions.filter((name) =>
    name.toLowerCase().includes(gymName.trim().toLowerCase()),
  )

  const [gymAddress, setGymAddress] = useState('')
  const [date, setDate] = useState(todayISO())
  const [now, setNow] = useState(() => new Date())
  const [time, setTime] = useState(() => getEarliestBookingTime(new Date()))
  const [types, setTypes] = useState<WorkoutType[]>(['Legs'])
  const [notes, setNotes] = useState('')
  const [showAddressDropdown, setShowAddressDropdown] = useState(false)

  const gymAddressSuggestions = GYMS.filter((gym) => {
    const query = gymAddress.trim().toLowerCase()
    if (!query) return false
    return [gym.address, gym.city, gym.zip ?? '', gym.name].some((value) =>
      value.toLowerCase().includes(query),
    )
  })
  const [maxParticipants, setMax] = useState(3)
  const toggleType = (t: WorkoutType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const today = todayISO()
  const isToday = date === today
  const earliestTodayTime = getEarliestBookingTime(now)
  const minTimeToday = earliestTodayTime
  const maxTimeToday = '23:59'

  const isTimeAllowed = (t: string) => {
    if (!isToday) return true
    return t >= minTimeToday && t <= maxTimeToday
  }

  const quickTimes = isToday
    ? ALL_HALF_HOUR_TIMES.filter((t) => t >= minTimeToday).slice(0, 12)
    : ALL_HALF_HOUR_TIMES.slice(0, 12)

  useEffect(() => {
    if (isToday && time < minTimeToday) {
      setTime(minTimeToday)
    }
  }, [date, time, isToday, minTimeToday])
  const [visibility, setVisibility] = useState<Visibility>('friends')
  const [recurring, setRecurring] = useState<'none' | 'daily' | 'weekly'>('none')
  const [creating, setCreating] = useState(false)
  const creatingRef = useRef(false)

  const handleCreate = async () => {
    if (creatingRef.current || types.length === 0) return
    if (!gymName.trim() || !gymAddress.trim()) {
      pushToast({
        title: 'Complete gym details',
        body: 'Enter the gym name and full address before posting.',
      })
      return
    }
    if (isToday && !isTimeAllowed(time)) {
      pushToast({
        title: 'Invalid time',
        body: 'Choose a time within the next hour and not in the past.',
      })
      return
    }
    if (atWorkoutLimit) {
      openPaywall('Unlimited workouts')
      return
    }
    creatingRef.current = true
    setCreating(true)
    const addressTrim = gymAddress.trim()
    const parts = addressTrim.split(',').map((p) => p.trim())
    const parsedCity = parts.length >= 2 ? parts[1] : ''
    const w = await createWorkout({
      gym: gymName.trim(),
      city: parsedCity,
      address: addressTrim,
      date,
      time,
      types,
      notes,
      maxParticipants,
      visibility,
      recurring,
    })
    if (!w) {
      creatingRef.current = false
      setCreating(false)
      return
    }
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
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-muted-foreground">
                Gym Name
              </label>
              <input
                type="text"
                value={gymName}
                onChange={(e) => {
                  setGymName(e.target.value)
                  setShowGymNameDropdown(true)
                }}
                onFocus={() => setShowGymNameDropdown(true)}
                onBlur={() => setTimeout(() => setShowGymNameDropdown(false), 150)}
                placeholder="LA Fitness, YouFit, Crunch Fitness, etc."
                className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {showGymNameDropdown && gymNameSuggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-56 overflow-auto rounded-2xl border border-border bg-card shadow-lg">
                  {gymNameSuggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setGymName(name)
                        setShowGymNameDropdown(false)
                      }}
                      className="w-full border-b border-border px-4 py-3 text-left text-sm text-foreground transition hover:bg-primary/10"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative mt-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Gym Address
              </label>
              <input
                type="text"
                value={gymAddress}
                onChange={(e) => {
                  setGymAddress(e.target.value)
                  setShowAddressDropdown(true)
                }}
                onFocus={() => setShowAddressDropdown(true)}
                onBlur={() => setTimeout(() => setShowAddressDropdown(false), 150)}
                placeholder="123 Main St, Boynton Beach, FL 33435"
                className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {showAddressDropdown && gymAddressSuggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-56 overflow-auto rounded-2xl border border-border bg-card shadow-lg">
                  {gymAddressSuggestions.map((gym) => (
                    <button
                      key={`${gym.name}-${gym.address}`}
                      type="button"
                      onClick={() => {
                        setGymAddress(gym.address)
                        setGymName(gym.name)
                        setShowAddressDropdown(false)
                      }}
                      className="w-full border-b border-border px-4 py-3 text-left text-sm text-foreground transition hover:bg-primary/10"
                    >
                      <p className="font-semibold">{gym.name}</p>
                      <p className="text-xs text-muted-foreground">{gym.address}</p>
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Enter full address, city, state, and zip for any commercial gym nationwide.
              </p>
            </div>
 
          </div>
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
            {quickTimes.map((t) => (
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
                min={isToday ? minTimeToday : '00:00'}
                max={isToday ? maxTimeToday : '23:59'}
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
              Free plan caps groups at {FREE_MAX_PARTICIPANTS}. Go Pro for unlimited participants.
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
                { v: 'none', label: 'Never' },
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
          onClick={() => void handleCreate()}
          disabled={types.length === 0 || creating}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime py-4 text-base font-extrabold text-lime-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <Check size={20} strokeWidth={3} />
          {creating ? 'Posting…' : 'Post Workout'}
        </button>
      </div>
    </div>
  )
}
