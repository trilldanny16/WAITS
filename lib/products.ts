// Source of truth for the paid subscription plan.
// Prices live server-side and are validated during checkout so the
// client can never tamper with the amount charged.
export interface Plan {
  id: string
  name: string
  description: string
  priceInCents: number
  interval: 'month' | 'year'
}

export const PLANS: Plan[] = [
  {
    id: 'waits-pro-monthly',
    name: 'Waits Pro',
    description: 'Crew chats, gallery access, stats, bigger groups & more.',
    priceInCents: 999, // $9.99 / month
    interval: 'month',
  },
]

export const PRO_PLAN = PLANS[0]
