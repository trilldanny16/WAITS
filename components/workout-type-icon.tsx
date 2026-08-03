import {
  Dumbbell,
  Activity,
  Footprints,
  HeartPulse,
  Bike,
  Zap,
  Waves,
  Mountain,
  Flame,
  PersonStanding,
  StretchHorizontal,
  Swords,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import type { WorkoutType } from '@/lib/types'

const MAP: Record<WorkoutType, LucideIcon> = {
  // Strength & Splits
  Push: Dumbbell,
  Pull: Dumbbell,
  Legs: Dumbbell,
  Upper: Dumbbell,
  Lower: Dumbbell,
  Chest: Dumbbell,
  Back: Dumbbell,
  Shoulders: Dumbbell,
  Arms: Dumbbell,
  Core: Activity,
  'Full Body': Dumbbell,
  // Muscle Groups
  Biceps: Dumbbell,
  Triceps: Dumbbell,
  Forearms: Dumbbell,
  Traps: Dumbbell,
  Lats: Dumbbell,
  Abs: Activity,
  Glutes: Dumbbell,
  Quads: Dumbbell,
  Hamstrings: Dumbbell,
  Calves: Dumbbell,
  // Cardio & Endurance
  Cardio: HeartPulse,
  Running: Footprints,
  Cycling: Bike,
  Rowing: Waves,
  Swimming: Waves,
  HIIT: Flame,
  // Studio & Classes
  Yoga: PersonStanding,
  Pilates: StretchHorizontal,
  Spin: Bike,
  Boxing: Swords,
  Kickboxing: Swords,
  Barre: PersonStanding,
  Mobility: StretchHorizontal,
  // Sports & Recreation
  Basketball: Activity,
  Pickleball: Activity,
  Tennis: Activity,
  Soccer: Activity,
  CrossFit: Zap,
  Climbing: Mountain,
  Other: MoreHorizontal,
}

export function WorkoutTypeIcon({
  type,
  size = 18,
  className,
}: {
  type: WorkoutType
  size?: number
  className?: string
}) {
  const Icon = MAP[type] ?? Dumbbell
  return <Icon size={size} className={className} aria-hidden="true" />
}
