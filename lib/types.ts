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

export interface GymLocation {
  name: string
  address: string
  city: string
  zip?: string
}

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
  /** Server-verified paid entitlement; never inferred from seed identity. */
  isVerifiedPro?: boolean
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
  address: string
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
    label: 'Studio, Classes & More',
    types: ['Yoga', 'Pilates', 'Spin', 'Boxing', 'Mobility', 'Basketball', 'CrossFit', 'Other'],
  },
]

/** flat list of every workout type, in category order */
export const WORKOUT_TYPES: WorkoutType[] = WORKOUT_CATEGORIES.flatMap((c) => c.types)

export const GYMS = [
  { name: 'Crunch Fitness', address: '123 Gym Ave, Miami, FL 33101', city: 'Miami', zip: '33101' },
  { name: 'Crunch Fitness', address: '234 Power St, Jacksonville, FL 32246', city: 'Jacksonville', zip: '32246' },
  { name: 'EOS Fitness', address: '456 Strength Blvd, Wellington, FL 33414', city: 'Wellington', zip: '33414' },
  { name: 'EOS Fitness', address: '567 Fit Ln, Boca Raton, FL 33431', city: 'Boca Raton', zip: '33431' },
  { name: 'EOS Fitness', address: '678 Power Ct, West Palm Beach, FL 33401', city: 'West Palm Beach', zip: '33401' },
  { name: 'YouFit', address: '345 Flex Ave, Miami, FL 33101', city: 'Miami', zip: '33101' },
  { name: 'YouFit', address: '456 Sweat St, West Palm Beach, FL 33401', city: 'West Palm Beach', zip: '33401' },
  { name: 'YouFit', address: '789 Grind Blvd, Boca Raton, FL 33431', city: 'Boca Raton', zip: '33431' },
  { name: 'YouFit', address: '890 Lift Rd, Jacksonville, FL 32246', city: 'Jacksonville', zip: '32246' },
  { name: 'LA Fitness', address: '789 Muscle St, Miami, FL 33101', city: 'Miami', zip: '33101' },
  { name: 'LA Fitness', address: '321 Strength Ave, Boynton Beach, FL 33435', city: 'Boynton Beach', zip: '33435' },
  { name: 'LA Fitness', address: '654 Workout Way, Jacksonville, FL 32250', city: 'Jacksonville', zip: '32250' },
  { name: 'Planet Fitness', address: '101 Fitness Way, Miami, FL 33101', city: 'Miami', zip: '33101' },
  { name: 'Gold’s Gym', address: '202 Power Ln, Miami, FL 33101', city: 'Miami', zip: '33101' },
  { name: 'Equinox', address: '303 Train Rd, Miami, FL 33101', city: 'Miami', zip: '33101' },
  { name: 'Retro Fitness', address: '404 Classic Ct, Miami, FL 33101', city: 'Miami', zip: '33101' },
]
