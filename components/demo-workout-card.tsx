import { CalendarDays, MapPin } from 'lucide-react'
import type { Workout } from '@/lib/types'

export function DemoWorkoutCard({ workout }: { workout: Workout }) {
  return (
    <article className="rounded-3xl bg-card p-4 ring-1 ring-border" aria-label="Demo workout preview">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Demo preview
          </span>
          <h3 className="mt-2 font-bold text-card-foreground">{workout.types.join(' + ')}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={13} /> {workout.gym}, {workout.city}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays size={13} /> {workout.date} at {workout.time}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Example discovery content. Attendance actions are available on real posted workouts.
      </p>
    </article>
  )
}
