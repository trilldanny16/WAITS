'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  ChevronLeft,
  MapPin,
  Lock,
  Check,
  UserPlus,
  Dumbbell,
  Crown,
  Plus,
  Images,
  BarChart3,
  Flame,
} from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { WorkoutCard } from '../workout-card'
import { WorkoutTypeIcon } from '../workout-type-icon'
import { formatTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase-client'

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Preset gym shots a free user can add to their own gallery (prototype:
// no runtime upload, so we cycle through a small sample pool).
const PRESET_PHOTOS = [
  '/gallery/danny-1.png',
  '/gallery/danny-2.png',
  '/gallery/danny-3.png',
  '/gallery/mike-1.png',
  '/gallery/lena-1.png',
]

const BLOCKED_PROFILE_WORDS = [
  'pussy',
  'dick',
  'penis',
  'fuck',
  'bitch',
  'asshole',
  'cunt',
  'slut',
  'whore',
  'nigger',
  'fag',
]

export function ProfileView({ userId, asTab = false }: { userId: string; asTab?: boolean }) {
  const {
    getUser,
    updateUser,
    workouts,
    following,
    followers,
    currentUserId,
    isFollowing,
    toggleFollow,
    isPremium,
    galleryFor,
    addGalleryPhoto,
  } = useStore()

  const { back, openWorkout, openPaywall } = useNav()
  const user = getUser(userId)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editHomeGym, setEditHomeGym] = useState(user.homeGym)
  const [editCity, setEditCity] = useState(user.city)
  const [editBio, setEditBio] = useState(user.bio)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    setEditName(user.name)
    setEditHomeGym(user.homeGym)
    setEditCity(user.city)
    setEditBio(user.bio)
    setEditError(null)
  }, [user.name, user.homeGym, user.city, user.bio])

  const handleSaveProfile = async () => {
    console.log('SAVE BUTTON CLICKED')

    const trimmedName = editName.trim()
    const nameParts = trimmedName.split(/\s+/).filter(Boolean)

  if (nameParts.length < 2) {
    setEditError('Enter your first and last name.')
    return
  }

  if (nameParts.some((part) => part.length < 2)) {
    setEditError('Use a real first and last name.')
    return
  }

  const lowerName = trimmedName.toLowerCase()

  if (BLOCKED_PROFILE_WORDS.some((bad) => lowerName.includes(bad))) {
    setEditError('Choose a proper name and avoid inappropriate words.')
    return
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    console.error('Could not verify signed-in user:', authError)
    setEditError('Could not verify your account.')
    return
  }

  const { data: savedProfile, error } = await supabase
    .from('profiles')
    .update({
      display_name: trimmedName,
      home_gym: editHomeGym.trim(),
      city: editCity.trim(),
      bio: editBio.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', authUser.id)
    .select('id, display_name, home_gym, city, bio')
    .single()

    console.log('PROFILE SAVE DEBUG', {
  authUserId: authUser.id,
  savedProfile,
  error,
})

  if (error || !savedProfile) {
    console.error('Failed to save profile:', error)
    setEditError(error?.message ?? 'Profile was not saved.')
    return
  }

  updateUser(authUser.id, {
    name: savedProfile.display_name ?? trimmedName,
    homeGym: savedProfile.home_gym ?? '',
    city: savedProfile.city ?? '',
    bio: savedProfile.bio ?? '',
  })

  setEditError(null)
  setIsEditing(false)
}

  const isSelf = userId === currentUserId
  const followed = isFollowing(userId)
  const locked = user.isPrivate && !isSelf && !followed
  const showProBadge = isSelf && isPremium
  const gallery = galleryFor(userId)
  // Free users can view their own gallery, but need Pro to see others'.
  const galleryLocked = !isSelf && !isPremium
  const handleAddPhoto = () => {
    const next = PRESET_PHOTOS[gallery.length % PRESET_PHOTOS.length]
    addGalleryPhoto(next)
  }

    const handleSignOut = async () => {
      const { error } = await supabase.auth.signOut()

     if (error) {
      console.error('Failed to sign out:', error)
      return
   }

   window.location.reload()
  }

  const myWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => w.hostId === userId)
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [workouts, userId],
  )

  // Weekly schedule keyed by weekday (Mon=0 .. Sun=6) so recurring
  // workouts show on their weekday regardless of the calendar week.
  const weekMap = useMemo(() => {
    const map: typeof myWorkouts[] = [[], [], [], [], [], [], []]
    for (const w of myWorkouts) {
      const [y, m, d] = w.date.split('-').map((n) => Number.parseInt(n, 10))
      const jsDay = new Date(y, m - 1, d).getDay() // 0 Sun .. 6 Sat
      const idx = (jsDay + 6) % 7 // 0 Mon .. 6 Sun
      map[idx].push(w)
    }
    // sort each day's entries by time
    map.forEach((day) => day.sort((a, b) => a.time.localeCompare(b.time)))
    return map
  }, [myWorkouts])

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-2 px-3 pb-1 pt-[calc(env(safe-area-inset-top)+14px)]">
        {!asTab ? (
          <button
            type="button"
            onClick={back}
            className="flex h-9 items-center justify-center gap-1 rounded-full bg-secondary px-3 text-sm font-bold text-secondary-foreground"
            aria-label="Back"
          >
            <ChevronLeft size={20} /> Back
          </button>
        ) : null}
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        {/* Identity */}
        <div className="flex flex-col items-center pt-4 text-center">
          <Avatar user={user} size={88} />
          <h1 className="mt-3 flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground">
            {user.name}
            {showProBadge ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground">
                <Crown size={11} />
                Pro
              </span>
            ) : null}
          </h1>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-foreground">
            <MapPin size={14} className="text-primary" />
            {user.homeGym}
          </p>
          {user.bio ? (
            <p className="mt-2 max-w-[18rem] text-pretty text-sm text-muted-foreground">
              {user.bio}
            </p>
          ) : null}
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center justify-center gap-8">
          <Stat value={myWorkouts.length} label="Workouts" />
          <Stat value={isSelf ? followers.length : Math.floor(4 + user.hue / 20)} label="Followers" />
          <Stat value={isSelf ? following.length : Math.floor(2 + user.hue / 30)} label="Following" />
        </div>

        {/* Follow / edit action */}
        <div className="mt-4">
          {isSelf ? (
            <div className="space-y-3">
              {isEditing ? (
                <div className="rounded-3xl bg-card p-4 ring-1 ring-border">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Name
                  </label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                  />
                  <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                    Home Gym
                  </label>
                  <input
                    value={editHomeGym}
                    onChange={(e) => setEditHomeGym(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                  />
                  <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                    City
                  </label>
                  <input
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                  />
                  <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                    Bio
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                    rows={3}
                  />
                  {editError ? (
                    <p className="mt-3 text-sm font-medium text-red-500">{editError}</p>
                  ) : null}
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="flex-1 rounded-2xl bg-secondary py-3 text-sm font-bold text-secondary-foreground"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 rounded-2xl border border-border py-3 text-sm font-bold text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full rounded-2xl bg-secondary py-3 text-sm font-bold text-secondary-foreground"
                >
                  Edit Profile
                </button>
              
              )}
              <button
  type="button"
  onClick={handleSignOut}
  className="mt-3 w-full rounded-2xl border border-red-500/30 py-3 text-sm font-bold text-red-500"
>
  Sign Out
</button>
            </div>

            
          ) : (
            <button
              type="button"
              onClick={() => toggleFollow(userId)}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-colors',
                followed
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-primary text-primary-foreground',
              )}
            >
              {followed ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  {user.isPrivate ? 'Requested' : 'Following'}
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  {user.isPrivate ? 'Request to Follow' : 'Follow'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Waits Pro upgrade / status (own profile) */}
        {isSelf ? (
          isPremium ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-foreground">
              <Crown size={22} className="shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-extrabold">Waits Pro member</p>
                <p className="text-xs text-primary-foreground/80">
                  Crew chats, galleries, stats &amp; more are unlocked.
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openPaywall()}
              className="mt-3 flex w-full items-center justify-center gap-3 rounded-2xl bg-primary p-4 text-primary-foreground"
            >
              <Crown size={22} className="shrink-0" />
              <div className="flex-1 text-center">
                <p className="text-base font-extrabold tracking-tight">Upgrade to Waits Pro</p>
                <p className="mt-1 text-xs text-primary-foreground/80">
                  Crew chats, photo galleries, reliability stats, etc.
                </p>
              </div>
              <Crown size={22} className="shrink-0" />
            </button>
          )
        ) : null}

        {/* Favorite split */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Dumbbell size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Favorite Split
            </p>
            <p className="text-sm font-semibold text-card-foreground">{user.favoriteSplit}</p>
          </div>
        </div>

        {/* Reliability & stats (Waits Pro) */}
        {!locked ? (
          <section className="mt-6">
            <h2 className="mb-3 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <BarChart3 size={14} />
              Reliability &amp; Stats
            </h2>
            {isPremium ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
                  <p className="text-xs font-semibold text-muted-foreground">Reliability</p>
                  <p className="mt-1 text-2xl font-extrabold text-foreground">
                    {user.reliability ?? 90}%
                  </p>
                  <p className="text-[11px] text-muted-foreground">Shows up when they say they will</p>
                </div>
                <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
                  <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <Flame size={12} className="text-primary" />
                    Streak
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-foreground">
                    {user.streak ?? 4} wks
                  </p>
                  <p className="text-[11px] text-muted-foreground">Consecutive active weeks</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openPaywall('Reliability & stats')}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left ring-1 ring-border"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Lock size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-card-foreground">See reliability &amp; streaks</p>
                  <p className="text-xs text-muted-foreground">
                    Attendance score and weekly insights with Waits Pro.
                  </p>
                </div>
                <Crown size={18} className="shrink-0 text-primary" />
              </button>
            )}
          </section>
        ) : null}

        {/* Photo gallery */}
        {!locked ? (
          <section className="mt-6">
            <h2 className="mb-3 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Images size={14} />
              Gym Gallery
            </h2>

            {galleryLocked ? (
              <button
                type="button"
                onClick={() => openPaywall('Photo galleries')}
                className="relative block w-full overflow-hidden rounded-3xl ring-1 ring-border"
              >
                <div className="grid grid-cols-3 gap-1">
                  {(gallery.length > 0 ? gallery : PRESET_PHOTOS.slice(0, 3)).slice(0, 3).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src || '/placeholder.svg'}
                      alt=""
                      className="aspect-square w-full scale-110 object-cover blur-md"
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/55 text-center backdrop-blur-[2px]">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Lock size={22} />
                  </span>
                  <p className="px-6 text-sm font-bold text-foreground">
                    See {user.name.split(' ')[0]}&apos;s photos with Waits Pro
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-lime px-3 py-1 text-xs font-extrabold text-lime-foreground">
                    <Crown size={12} />
                    Unlock Gallery
                  </span>
                </div>
              </button>
            ) : gallery.length === 0 && !isSelf ? (
              <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
                No photos yet.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {isSelf ? (
                  <button
                    type="button"
                    onClick={handleAddPhoto}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    aria-label="Add photo"
                  >
                    <Plus size={22} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Add</span>
                  </button>
                ) : null}
                {gallery.map((src, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl ring-1 ring-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src || '/placeholder.svg'}
                      alt="Gym photo"
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {locked ? (
          <div className="mt-6 flex flex-col items-center rounded-3xl bg-card px-6 py-10 text-center ring-1 ring-border">
            <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Lock size={24} />
            </span>
            <h2 className="mt-3 text-base font-bold text-foreground">This account is private</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow {user.name.split(' ')[0]} to see their weekly schedule and workouts.
            </p>
          </div>
        ) : (
          <>
            {/* Weekly schedule */}
            <section className="mt-6">
              <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Weekly Schedule
              </h2>
              <div className="space-y-1.5 rounded-3xl bg-card p-3 ring-1 ring-border">
                {WEEK_LABELS.map((label, i) => {
                  const items = weekMap[i]
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className="w-9 shrink-0 text-center text-xs font-bold text-muted-foreground">
                        {WEEK_LABELS[i]}
                      </span>
                      <div className="flex min-h-9 flex-1 flex-wrap items-center gap-1.5">
                        {items.length === 0 ? (
                          <span className="text-xs text-muted-foreground/60">Rest</span>
                        ) : (
                          items.map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => openWorkout(w.id)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 text-xs font-bold text-lime-foreground"
                            >
                              <WorkoutTypeIcon type={w.types[0]} size={12} />
                              {w.types.join(' + ')} · {formatTime(w.time)}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Upcoming workouts */}
            {myWorkouts.length > 0 ? (
              <section className="mt-6">
                <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Upcoming Workouts
                </h2>
                <div className="space-y-3">
                  {myWorkouts.map((w) => (
                    <WorkoutCard key={w.id} workout={w} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}
