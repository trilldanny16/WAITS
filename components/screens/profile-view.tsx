'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  ChevronLeft,
  MapPin,
  Lock,
  X,
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
import { SocialList } from './social-list'
import {
  getFriendRequestState,
  cancelFriendRequest,
  sendFriendRequest,
  type FriendRequestState,
} from '@/lib/friend-requests'

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
    isPremium,
    galleryFor,
    addGalleryPhoto,
    removeGalleryPhoto,
    disconnectUser,
    pushToast,
  } = useStore()

  const { back, openWorkout, openPaywall } = useNav()
  const user = getUser(userId)
  const isSelf = userId === currentUserId

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editHomeGym, setEditHomeGym] = useState(user.homeGym)
  const [editCity, setEditCity] = useState(user.city)
  const [editBio, setEditBio] = useState(user.bio)
  const [editFavoriteSplit, setEditFavoriteSplit] = useState(user.favoriteSplit)
  const [editError, setEditError] = useState<string | null>(null)
  const [socialListKind, setSocialListKind] = useState<'followers' | 'following' | null>(null)
  const [viewedConnectionCount, setViewedConnectionCount] = useState(0)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [friendRequestState, setFriendRequestState] = useState<FriendRequestState>('none')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [persistedPhotos, setPersistedPhotos] = useState<{ id: string; path: string; url: string }[]>([])

  useEffect(() => {
    setEditName(user.name)
    setEditHomeGym(user.homeGym)
    setEditCity(user.city)
    setEditBio(user.bio)
    setEditFavoriteSplit(user.favoriteSplit)
    setEditError(null)
  }, [user.name, user.homeGym, user.city, user.bio, user.favoriteSplit])

  useEffect(() => {
    let active = true

    if (isSelf) {
      setViewedConnectionCount(0)
      return () => {
        active = false
      }
    }

    const loadViewedConnectionCount = async () => {
      const { data, error } = await supabase.rpc('get_profile_connection_count', {
        profile_id: userId,
      })

      if (!active) return

      if (error) {
        console.error('Failed to load viewed profile connection count:', error)
        setViewedConnectionCount(0)
        return
      }

      setViewedConnectionCount(Number(data ?? 0))
    }

    void loadViewedConnectionCount()

    return () => {
      active = false
    }
  }, [isSelf, userId])

  useEffect(() => {
    let active = true
    if (isSelf) return () => { active = false }

    const loadState = async () => {
      const result = await getFriendRequestState(currentUserId, userId)
      if (!active) return
      if (!result.ok) setConnectionError(result.error ?? 'Could not load connection state.')
      else setFriendRequestState(result.state)
    }

    void loadState()
    return () => { active = false }
  }, [currentUserId, isSelf, userId])

  useEffect(() => {
    const loadPhotos = async () => {
      const { data } = await supabase.from('profile_photos').select('id, storage_path').eq('user_id', userId).order('created_at')
      setPersistedPhotos((data ?? []).map((photo) => ({ id: photo.id, path: photo.storage_path, url: supabase.storage.from('profile-media').getPublicUrl(photo.storage_path).data.publicUrl })))
    }
    void loadPhotos()
  }, [userId])

  const handleSaveProfile = async () => {
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
      favorite_split: editFavoriteSplit.trim() || 'Not set',
      updated_at: new Date().toISOString(),
    })
    .eq('id', authUser.id)
    .select('id, display_name, home_gym, city, bio, favorite_split')
    .single()

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
    favoriteSplit: savedProfile.favorite_split ?? 'Not set',
  })

  setEditError(null)
  setIsEditing(false)
}

  const handleDisconnect = async () => {
    if (disconnecting) return

    setDisconnecting(true)
    setConnectionError(null)
    const result = await disconnectUser(userId)

    if (!result.ok) {
      setConnectionError(result.error ?? 'The connection could not be removed.')
      setDisconnecting(false)
      return
    }

    setViewedConnectionCount((count) => Math.max(0, count - 1))
    setFriendRequestState('none')
    pushToast({
      title: 'Unfollowed',
      body: `You and ${user.name.split(' ')[0]} are no longer connected.`,
    })
    setDisconnecting(false)
  }

  const handleAddFriend = async () => {
    if (sendingRequest || friendRequestState !== 'none') return
    setSendingRequest(true)
    setConnectionError(null)

    const result = await sendFriendRequest(currentUserId, userId)
    if (!result.ok) {
      setConnectionError(result.error ?? 'The friend request could not be sent.')
      setSendingRequest(false)
      return
    }

    setFriendRequestState(result.state)
    pushToast({
      title: result.created ? 'Friend request sent' : 'Request already active',
      body: result.created ? `${user.name.split(' ')[0]} will see it in Chats.` : undefined,
    })
    setSendingRequest(false)
  }

  const handleCancelRequest = async () => {
    if (sendingRequest || friendRequestState !== 'pending_outgoing') return
    setSendingRequest(true)
    setConnectionError(null)

    const result = await cancelFriendRequest(currentUserId, userId)
    if (!result.ok) {
      setConnectionError(result.error ?? 'The follow request could not be canceled.')
      setSendingRequest(false)
      return
    }

    setFriendRequestState('none')
    pushToast({ title: 'Follow request canceled' })
    setSendingRequest(false)
  }

  const followed = isFollowing(userId)
  const locked = user.isPrivate && !isSelf && !followed
  const showProBadge = user.isVerifiedPro === true
  const gallery = [...persistedPhotos.map((photo) => photo.url), ...galleryFor(userId)]
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

  const hostedWorkouts = useMemo(
    () => workouts.filter((workout) => workout.hostId === userId),
    [workouts, userId],
  )

  const scheduledWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => w.hostId === userId || w.attendees.includes(userId))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [workouts, userId],
  )

  // Weekly schedule keyed by weekday (Mon=0 .. Sun=6) so recurring
  // workouts show on their weekday regardless of the calendar week.
  const weekMap = useMemo(() => {
    const map: typeof scheduledWorkouts[] = [[], [], [], [], [], [], []]
    for (const w of scheduledWorkouts) {
      const [y, m, d] = w.date.split('-').map((n) => Number.parseInt(n, 10))
      const jsDay = new Date(y, m - 1, d).getDay() // 0 Sun .. 6 Sat
      const idx = (jsDay + 6) % 7 // 0 Mon .. 6 Sun
      map[idx].push(w)
    }
    // sort each day's entries by time
    map.forEach((day) => day.sort((a, b) => a.time.localeCompare(b.time)))
    return map
  }, [scheduledWorkouts])

  if (socialListKind) {
    return (
      <SocialList
        userId={userId}
        kind={socialListKind}
        onBack={() => setSocialListKind(null)}
      />
    )
  }

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

      <div className="no-scrollbar relative flex-1 overflow-y-auto px-5 pb-6">
        {/* Identity */}
        <div className="flex flex-col items-center pt-4 text-center">
          <div className="relative">
            <Avatar user={user} size={88} />
            {isSelf ? (
              <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground shadow">
                Edit
                <input type="file" accept="image/*" className="hidden" onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  const extension = file.name.split('.').pop() || 'jpg'
                  const path = `${currentUserId}/avatar-${crypto.randomUUID()}.${extension}`
                  const { error: uploadError } = await supabase.storage.from('profile-media').upload(path, file)
                  if (uploadError) { pushToast({ title: 'Avatar upload failed', body: uploadError.message }); return }
                  const { error: saveError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', currentUserId)
                  if (saveError) { pushToast({ title: 'Avatar was not saved', body: saveError.message }); return }
                  const { data } = supabase.storage.from('profile-media').getPublicUrl(path)
                  updateUser(currentUserId, { avatar: data.publicUrl } as never)
                  pushToast({ title: 'Profile picture updated' })
                }} />
              </label>
            ) : null}
          </div>
          <h1 className="mt-3 flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground">
            {user.name}
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
          <Stat value={hostedWorkouts.length} label="Workouts" />
          <Stat
            value={isSelf ? followers.length : viewedConnectionCount}
            label="Followers"
            onClick={() => setSocialListKind('followers')}
          />
          <Stat
            value={isSelf ? following.length : viewedConnectionCount}
            label="Following"
            onClick={() => setSocialListKind('following')}
          />
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
                  <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                    Favorite Split
                  </label>
                  <input
                    value={editFavoriteSplit}
                    onChange={(event) => setEditFavoriteSplit(event.target.value)}
                    placeholder="Push / Pull / Legs"
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
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
            <div>
              <button
                type="button"
                onClick={followed
                  ? handleDisconnect
                  : friendRequestState === 'none'
                    ? handleAddFriend
                    : friendRequestState === 'pending_outgoing'
                      ? handleCancelRequest
                      : undefined}
                disabled={
                  disconnecting ||
                  sendingRequest ||
                  (!followed && (friendRequestState === 'pending_incoming' || friendRequestState === 'accepted'))
                }
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-colors disabled:opacity-60',
                  followed
                    ? 'border border-red-500/30 bg-background text-red-500'
                    : 'bg-secondary text-secondary-foreground',
                )}
              >
                {followed ? (
                  <>
                    <X size={16} strokeWidth={3} />
                    {disconnecting ? 'Unfollowing...' : 'Unfollow'}
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    {sendingRequest
                      ? friendRequestState === 'pending_outgoing' ? 'Canceling...' : 'Sending...'
                      : friendRequestState === 'pending_outgoing'
                        ? 'Cancel Request'
                      : friendRequestState === 'pending_incoming'
                        ? 'Request Received'
                        : friendRequestState === 'accepted'
                          ? 'Connected'
                          : 'Follow'}
                  </>
                )}
              </button>
              {connectionError ? (
                <p role="alert" className="mt-2 text-center text-sm font-medium text-red-500">
                  {connectionError}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Waits Pro upgrade / status (own profile) */}
        {showProBadge ? (
          <span className="absolute right-5 top-4 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow">
            <Crown size={24} />
          </span>
        ) : null}

        {isSelf ? (
          isPremium ? (
            <button type="button" onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession()
              if (!session) return
              const response = await fetch('/api/stripe/customer-portal', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
              const data = await response.json()
              if (response.ok && data.url) window.location.href = data.url
              else pushToast({ title: 'Billing unavailable', body: data.error ?? 'Could not open billing settings.' })
            }} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left ring-1 ring-border">
              <Crown size={22} className="shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-extrabold">Pro Settings &amp; Billing</p>
                <p className="text-xs text-primary-foreground/80">
                  Manage payment method, subscription, and billing status.
                </p>
              </div>
            </button>
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
            {(isSelf ? user.isVerifiedPro === true : isPremium) ? (
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl bg-card p-4 ring-1 ring-border">
                  <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">ðŸ›¡ï¸ Reliability</p>
                  <p className="mt-1 text-2xl font-extrabold text-foreground">
                    {user.reliability == null ? 'Not available' : `${user.reliability}%`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {user.reliability == null ? 'Requires verified workout completion and no-show events.' : 'Based on verified attendance.'}
                  </p>
                </div>
                <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl bg-card p-4 ring-1 ring-border">
                  <p className="flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground">
                    <Flame size={12} className="text-primary" />
                    Streak
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-foreground">
                    {user.streak == null ? 'Not available' : `${user.streak} WEEKS`}
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
                  <label
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Plus size={22} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Add</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      const path = `${currentUserId}/gallery-${crypto.randomUUID()}.${file.name.split('.').pop() || 'jpg'}`
                      const upload = await supabase.storage.from('profile-media').upload(path, file)
                      if (upload.error) { pushToast({ title: 'Photo upload failed', body: upload.error.message }); return }
                      const inserted = await supabase.from('profile_photos').insert({ user_id: currentUserId, storage_path: path }).select('id').single()
                      if (inserted.error || !inserted.data) { pushToast({ title: 'Photo was not saved', body: inserted.error?.message }); return }
                      setPersistedPhotos((previous) => [...previous, { id: inserted.data.id, path, url: supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl }])
                    }} />
                  </label>
                ) : null}
                {gallery.map((src, i) => (
                  <div key={`${src}-${i}`} className="relative overflow-hidden rounded-2xl ring-1 ring-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src || '/placeholder.svg'}
                      alt="Gym photo"
                      className="aspect-square w-full object-cover"
                    />
                    {isSelf ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const persisted = persistedPhotos.find((photo) => photo.url === src)
                          if (!persisted) { removeGalleryPhoto(src); return }
                          const deleted = await supabase.from('profile_photos').delete().eq('id', persisted.id).eq('user_id', currentUserId).select('id').single()
                          if (deleted.error) { pushToast({ title: 'Photo was not removed', body: deleted.error.message }); return }
                          await supabase.storage.from('profile-media').remove([persisted.path])
                          setPersistedPhotos((previous) => previous.filter((photo) => photo.id !== persisted.id))
                        }}
                        className="absolute bottom-1.5 right-1.5 rounded-full bg-destructive px-2 py-1 text-[10px] font-bold text-destructive-foreground shadow"
                        aria-label="Remove photo"
                      >
                        Remove
                      </button>
                    ) : null}
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
                              {w.types.join(' + ')} Â· {formatTime(w.time)}
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
            {scheduledWorkouts.length > 0 ? (
              <section className="mt-6">
                <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Upcoming Workouts
                </h2>
                <div className="space-y-3">
                  {scheduledWorkouts.map((w) => (
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

function Stat({ value, label, onClick }: { value: number; label: string; onClick?: () => void }) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative z-10 min-w-20 touch-manipulation rounded-xl px-2 py-2 text-center hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary"
      >
        <p className="text-xl font-extrabold text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </button>
    )
  }
  return (
    <div className="text-center">
      <p className="text-xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

