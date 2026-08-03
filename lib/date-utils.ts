export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** "7:00 PM" from "19:00" */
export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':')
  let h = Number.parseInt(hStr, 10)
  const m = mStr ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

/** minutes since midnight, for sorting */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((n) => Number.parseInt(n, 10))
  return h * 60 + (m || 0)
}

const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map((n) => Number.parseInt(n, 10))
  return new Date(y, m - 1, d)
}

export function weekdayLong(iso: string): string {
  return WEEKDAY_LONG[parseISO(iso).getDay()]
}

export function weekdayShort(iso: string): string {
  return WEEKDAY_SHORT[parseISO(iso).getDay()]
}

/** "Fri, Aug 7" */
export function formatDateLabel(iso: string): string {
  const d = parseISO(iso)
  return `${WEEKDAY_SHORT[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** Bucket label used in the feed */
export function relativeBucket(iso: string, time: string): 'today' | 'tonight' | 'week' | 'past' {
  const today = todayISO()
  if (iso < today) return 'past'
  if (iso === today) {
    return timeToMinutes(time) >= 17 * 60 ? 'tonight' : 'today'
  }
  return 'week'
}

/** Returns the 7 ISO dates for the current week starting Monday */
export function currentWeekDates(): string[] {
  const now = new Date()
  const day = now.getDay() // 0 sun .. 6 sat
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export function relativeMessageTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}
