'use client'

import { useCallback, useEffect, useState } from 'react'
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
import type { Workout } from '@/lib/types'
import { supabase } from '@/lib/supabase-client'
import { SafetyActions } from '../safety-actions'

function getDirectionsUrl(lat: number, lng: number) {
  const destination = `${lat},${lng}`
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)
  return isIOS
    ? `https://maps.apple.com/?daddr=${destination}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}

export function WorkoutDetail({ id }: { id: string }) {
  const { workouts } = useStore()
  const { back } = useNav()
  const workout = workouts.find((candidate) => candidate.id === id)

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

  return <WorkoutDetailContent workout={workout} />
}

function WorkoutDetailContent({ workout }: { workout: Workout }) {
  const { getUser, isFull, hasJoined, joinWorkout, leaveWorkout, cancelWorkout, isPremium, currentUserId } =
    useStore()
  const { back, openChat, openUser, openPaywall } = useNav()
  const [persistedAttendees, setPersistedAttendees] = useState<string[]>([])
  const [attendanceOutcomes, setAttendanceOutcomes] = useState<Record<string, 'attended' | 'no_show'>>({})
  const [verifyingUserId, setVerifyingUserId] = useState<string | null>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  const host = getUser(workout.hostId)
  const isHost = workout.hostId === currentUserId
  const joined = hasJoined(workout)
  const full = isFull(workout)
  const spotsLeft = workout.maxParticipants - workout.attendees.length
  const canChat = joined || isHost
  const persistedWorkoutId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workout.id)
  const workoutHasPassed = new Date(`${workout.date}T${workout.time}:00`).getTime() <= Date.now()

  const loadAttendanceVerification = useCallback(async () => {
    if (!isHost || !persistedWorkoutId || !workoutHasPassed) {
      setPersistedAttendees([])
      setAttendanceOutcomes({})
      return
    }

    const [attendeeResult, outcomeResult] = await Promise.all([
      supabase
        .from('workout_attendees')
        .select('user_id')
        .eq('workout_id', workout.id),
      supabase
        .from('workout_attendance_outcomes')
        .select('participant_id, outcome')
        .eq('workout_id', workout.id),
    ])

    if (attendeeResult.error || outcomeResult.error) {
      setVerificationError((attendeeResult.error ?? outcomeResult.error)?.message ?? 'Verification data could not be loaded.')
      return
    }

    setPersistedAttendees((attendeeResult.data ?? []).map((row) => row.user_id))
    setAttendanceOutcomes(Object.fromEntries(
      (outcomeResult.data ?? []).map((row) => [row.participant_id, row.outcome as 'attended' | 'no_show']),
    ))
    setVerificationError(null)
  }, [isHost, persistedWorkoutId, workout.date, workout.id, workout.time, workoutHasPassed])

  useEffect(() => {
    void loadAttendanceVerification()
  }, [loadAttendanceVerification])

  const verifyAttendance = async (participantId: string, outcome: 'attended' | 'no_show') => {
    if (verifyingUserId) return
    setVerifyingUserId(participantId)
    setVerificationError(null)
    const { error } = await supabase.rpc('verify_workout_attendance', {
      target_workout_id: workout.id,
      target_participant_id: participantId,
      target_outcome: outcome,
    })
    if (error) {
      setVerificationError(error.message)
      setVerifyingUserId(null)
      return
    }
    await loadAttendanceVerification()
    setVerifyingUserId(null)
  }

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
          {isHost && persistedWorkoutId && workoutHasPassed && persistedAttendees.length > 0 ? (
            <div className="mt-3 rounded-2xl bg-card p-3 ring-1 ring-border">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Verify attendance
              </p>
              <div className="space-y-2">
                {persistedAttendees.map((participantId) => {
                  const participant = getUser(participantId)
                  const selected = attendanceOutcomes[participantId]
                  return (
                    <div key={participantId} className="flex items-center gap-2">
                      <Avatar user={participant} size={30} />
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-card-foreground">
                        {participant.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => void verifyAttendance(participantId, 'attended')}
                        disabled={verifyingUserId === participantId}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-bold',
                          selected === 'attended'
                            ? 'bg-lime text-lime-foreground'
                            : 'bg-secondary text-secondary-foreground',
                        )}
                      >
                        Attended
                      </button>
                      <button
                        type="button"
                        onClick={() => void verifyAttendance(participantId, 'no_show')}
                        disabled={verifyingUserId === participantId}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-bold',
                          selected === 'no_show'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-secondary text-secondary-foreground',
                        )}
                      >
                        No Show
                      </button>
                    </div>
                  )
                })}
              </div>
              {verificationError ? (
                <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                  {verificationError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {!isHost ? (
          <SafetyActions targetType="workout" targetId={workout.id} targetName={host.name}
            blockUserId={workout.hostId} onBlocked={back} />
        ) : null}

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
              <button
                type="button"
                onClick={() => openChat(workout.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary py-4 text-sm font-bold text-secondary-foreground"
              >
                <MessageCircle size={18} />
                Open Chat
              </button>
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
              Wait Up!
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

