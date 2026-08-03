export type WorkoutType =
  // Strength & Splits
  | 'Push'
  | 'Pull'
  | 'Legs'
  | 'Upper'
  | 'Lower'
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Arms'
  | 'Core'
  | 'Full Body'
  // Muscle Groups
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Traps'
  | 'Lats'
  | 'Abs'
  | 'Glutes'
  | 'Quads'
  | 'Hamstrings'
  | 'Calves'
  // Cardio & Endurance
  | 'Cardio'
  | 'Running'
  | 'Cycling'
  | 'Rowing'
  | 'Swimming'
  | 'HIIT'
  // Studio & Classes
  | 'Yoga'
  | 'Pilates'
  | 'Spin'
  | 'Boxing'
  | 'Kickboxing'
  | 'Barre'
  | 'Mobility'
  // Sports & Recreation
  | 'Basketball'
  | 'Pickleball'
  | 'Tennis'
  | 'Soccer'
  | 'CrossFit'
  | 'Climbing'
  | 'Other'

export type Visibility = 'friends' | 'public'

export interface User {
  id: string
  name: string
  username: string
  bio: string
  homeGym: string
  city: string
  favoriteSplit: string
  /** hue used as fallback if no avatar image */
  hue: number
  /** path to the user's avatar image */
  avatar?: string
  isPrivate: boolean
  /** gym progress photos shown in the profile gallery */
  gallery?: string[]
  /** premium-only reliability stats */
  reliability?: number
  streak?: number
  /** premium profile theme accent (CSS color) */
  themeColor?: string
}

export interface ChatMessage {
  id: string
  workoutId: string
  userId: string
  text: string
  createdAt: number
}

export interface Workout {
  id: string
  hostId: string
  gym: string
  city: string
  /** optional geo coordinates for the gym location */
  lat?: number
  lng?: number
  /** ISO date string yyyy-mm-dd */
  date: string
  /** 24h time HH:mm */
  time: string
  /** one or more activities for this session */
  types: WorkoutType[]
  notes: string
  maxParticipants: number
  visibility: Visibility
  /** user ids that have joined (host is always included) */
  attendees: string[]
  recurring: 'none' | 'daily' | 'weekly'
}

export interface WorkoutCategory {
  label: string
  types: WorkoutType[]
}

export const WORKOUT_CATEGORIES: WorkoutCategory[] = [
  {
    label: 'Strength & Splits',
    types: ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Full Body'],
  },
  {
    label: 'Muscle Groups',
    types: ['Biceps', 'Triceps', 'Forearms', 'Traps', 'Lats', 'Abs', 'Glutes', 'Quads', 'Hamstrings', 'Calves'],
  },
  {
    label: 'Cardio & Endurance',
    types: ['Cardio', 'Running', 'Cycling', 'Rowing', 'Swimming', 'HIIT'],
  },
  {
    label: 'Studio & Classes',
    types: ['Yoga', 'Pilates', 'Spin', 'Boxing', 'Kickboxing', 'Barre', 'Mobility'],
  },
  {
    label: 'Sports & Recreation',
    types: ['Basketball', 'Pickleball', 'Tennis', 'Soccer', 'CrossFit', 'Climbing', 'Other'],
  },
]

/** flat list of every workout type, in category order */
export const WORKOUT_TYPES: WorkoutType[] = WORKOUT_CATEGORIES.flatMap((c) => c.types)

export const GYMS = [
  'Crunch Fitness',
  'EOS Fitness',
  'LA Fitness',
  'Planet Fitness',
  'Gold’s Gym',
  'Equinox',
  'The Yard',
]
