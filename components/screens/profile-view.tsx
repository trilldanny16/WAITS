'use client'

import { useMemo, useRef, useState, useEffect, type ChangeEvent } from 'react'
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
  Pencil,
  Clock,
  ShieldCheck,
  TrendingUp,
  Camera,
} from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { useStartDirectMessage } from '../use-start-direct-message'
import { ShareWaitsButton } from '../share-waits-button'
import { WorkoutTypeIcon } from '../workout-type-icon'
import { formatTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase-client'
import { SocialList } from './social-list'
import { SafetyActions } from '../safety-actions'
import {
  getFriendRequestState,
  cancelFriendRequest,
  sendFriendRequest,
  type FriendRequestState,
  isPersistedUserId,
} from '@/lib/friend-requests'

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Preset gym shots are used only as blurred placeholders behind the Free-user lock.
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

  const { back, openWorkout, openPaywall, openSettings } = useNav()
  const { startDirectMessage, startingDm } = useStartDirectMessage()
  const user = getUser(userId)
  const isSelf = userId === currentUserId
  const isPersistedProfile = isPersistedUserId(userId)

  const [isEditing, setIsEditing] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [showPreviewFixtures, setShowPreviewFixtures] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editHomeGym, setEditHomeGym] = useState(user.homeGym)
  const [editCity, setEditCity] = useState(user.city)
  const [editBio, setEditBio] = useState(user.bio)
  const [editFavoriteSplit, setEditFavoriteSplit] = useState(user.favoriteSplit)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    setShowPreviewFixtures(window.location.hostname.includes('git-codex-profile-schedule-pro-audit'))
  }, [])

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || avatarUploading) return

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    if (!allowedTypes.has(file.type)) {
      setAvatarError('Choose a JPG, PNG, WebP, or GIF image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Profile pictures must be 5 MB or smaller.')
      return
    }

    setAvatarUploading(true)
    setAvatarError(null)
    const extensionByType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const path = `${currentUserId}/avatar-${Date.now()}.${extensionByType[file.type]}`
    const upload = await supabase.storage.from('profile-media').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    if (upload.error) {
      setAvatarError(upload.error.message)
      setAvatarUploading(false)
      return
    }

    const saved = await supabase
      .from('profiles')
      .update({ avatar_path: path })
      .eq('id', currentUserId)
      .select('id')
      .single()
    if (saved.error) {
      await supabase.storage.from('profile-media').remove([path])
      setAvatarError(saved.error.message)
      setAvatarUploading(false)
      return
    }

    const avatar = supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl
    updateUser(currentUserId, { avatar })
    pushToast({ title: 'Profile picture updated' })
    setAvatarUploading(false)
  }
  useEffect(() => {
    const resetPortalLoading = () => setOpeningPortal(false)
    const resetWhenVisible = () => {
      if (document.visibilityState === 'visible') resetPortalLoading()
    }

    window.addEventListener('focus', resetPortalLoading)
    window.addEventListener('pageshow', resetPortalLoading)
    document.addEventListener('visibilitychange', resetWhenVisible)

    return () => {
      window.removeEventListener('focus', resetPortalLoading)
      window.removeEventListener('pageshow', resetPortalLoading)
      document.removeEventListener('visibilitychange', resetWhenVisible)
    }
  }, [])

  const openBillingPortal = async () => {
    if (openingPortal) return
    setOpeningPortal(true)
    setPortalError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setPortalError('Sign in again to manage your membership.')
      pushToast({ title: 'Billing unavailable', body: 'Sign in again to manage your membership.' })
      setOpeningPortal(false)
      return
    }

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json()
      if (!response.ok || !result.url) {
        const message = result.error ?? 'Billing settings are temporarily unavailable.'
        setPortalError(message)
        pushToast({ title: 'Billing unavailable', body: message })
        setOpeningPortal(false)
        return
      }
      window.location.href = result.url
    } catch {
      setPortalError('Billing settings are temporarily unavailable.')
      pushToast({ title: 'Billing unavailable', body: 'Billing settings are temporarily unavailable.' })
      setOpeningPortal(false)
    }
  }

  const [socialListKind, setSocialListKind] = useState<'followers' | 'following' | null>(null)
  const [viewedConnectionCount, setViewedConnectionCount] = useState(0)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [friendRequestState, setFriendRequestState] = useState<FriendRequestState>('none')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [verifiedReliability, setVerifiedReliability] = useState<number | null>(null)
  const [verifiedStreak, setVerifiedStreak] = useState<number | null>(null)

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

    if (isSelf || !isPersistedProfile) {
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
  }, [isPersistedProfile, isSelf, userId])

  useEffect(() => {
    let active = true
    if (isSelf || !isPersistedProfile) {
      setFriendRequestState('none')
      setConnectionError(null)
      return () => { active = false }
    }

    const loadState = async () => {
      const result = await getFriendRequestState(currentUserId, userId)
      if (!active) return
      if (!result.ok) setConnectionError(result.error ?? 'Could not load connection state.')
      else setFriendRequestState(result.state)
    }

    void loadState()
    return () => { active = false }
  }, [currentUserId, isPersistedProfile, isSelf, userId])

  useEffect(() => {
    let active = true
    if (!isPersistedUserId(userId)) {
      setVerifiedReliability(null)
      setVerifiedStreak(null)
      return () => { active = false }
    }

    const loadVerifiedStatistics = async () => {
      const { data, error } = await supabase.rpc('get_profile_verified_attendance', {
        target_profile_id: userId,
      })
      if (!active) return
      if (error) {
        console.error('Failed to load verified attendance statistics:', error)
        setVerifiedReliability(null)
        setVerifiedStreak(null)
        return
      }

      const outcomes = (data ?? []) as Array<{ outcome: 'attended' | 'no_show'; workout_date: string }>
      const attended = outcomes.filter((row) => row.outcome === 'attended')
      const noShows = outcomes.filter((row) => row.outcome === 'no_show')
      const verifiedTotal = attended.length + noShows.length
      setVerifiedReliability(
        verifiedTotal === 0 ? null : Math.round((attended.length / verifiedTotal) * 100),
      )

      const weekStarts = Array.from(new Set(attended.map((row) => {
        const date = new Date(`${row.workout_date}T12:00:00`)
        const day = (date.getDay() + 6) % 7
        date.setDate(date.getDate() - day)
        return date.toISOString().slice(0, 10)
      }))).sort().reverse()

      if (weekStarts.length === 0) {
        setVerifiedStreak(null)
        return
      }

      let streak = 1
      let previous = new Date(`${weekStarts[0]}T12:00:00`)
      for (const weekStart of weekStarts.slice(1)) {
        const expected = new Date(previous)
        expected.setDate(expected.getDate() - 7)
        if (weekStart !== expected.toISOString().slice(0, 10)) break
        streak += 1
        previous = new Date(`${weekStart}T12:00:00`)
      }
      setVerifiedStreak(streak)
    }

    void loadVerifiedStatistics()
    return () => { active = false }
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
  // Accepted connections populate both lists; a pending/one-way follow is not enough.
  const mutuallyFollowing = following.includes(userId) && followers.includes(userId)
  const scheduleLocked = locked || (!isSelf && !isPremium && !mutuallyFollowing)
  const showProBadge = user.isVerifiedPro === true
  const gallery = galleryFor(userId)
  // Gallery access is enforced by both the Pro UI gate and Supabase RLS.
  const galleryLocked = !isPremium
  const previewReliability = user.reliability ?? (isSelf ? 92 : 89)
  const previewStreak = user.streak ?? (isSelf ? 4 : 6)
  const displayedReliability = verifiedReliability ?? (showPreviewFixtures ? previewReliability : null)
  const displayedStreak = verifiedStreak ?? (showPreviewFixtures ? previewStreak : null)
  const showingPreviewStats = showPreviewFixtures && (verifiedReliability == null || verifiedStreak == null)
  const handleAddPhoto = () => galleryInputRef.current?.click()
  const handleGalleryChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || galleryUploading) return
    setGalleryUploading(true)
    await addGalleryPhoto(file)
    setGalleryUploading(false)
  }

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    const { error } = await supabase.auth.signOut({ scope: 'local' })

    if (error) {
      console.error('Failed to sign out:', error)
      setSigningOut(false)
      pushToast({ title: 'Sign out failed', body: error.message })
    }
  }

  const hostedWorkouts = useMemo(
    () => workouts.filter((workout) => workout.hostId === userId),
    [workouts, userId],
  )

  const scheduledWorkouts = useMemo(
    () =>
      (scheduleLocked ? [] : workouts)
        .filter((workout) => workout.hostId === userId || workout.attendees.includes(userId))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [workouts, userId, scheduleLocked],
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
        {isSelf ? <ShareWaitsButton /> : null}
        {showProBadge ? (
          <span className="ml-auto flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow" aria-label="Verified WAITS Pro member">
            <Crown size={24} />
          </span>
        ) : null}
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        {/* Identity */}
        <div className="flex flex-col items-center pt-4 text-center">
          <div className="relative">
            <Avatar user={user} size={88} />
            {isSelf ? (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground shadow ring-1 ring-border disabled:opacity-60"
                  aria-label="Edit profile picture"
                >
                  <Pencil size={10} /> {avatarUploading ? 'Saving…' : 'Edit'}
                </button>
              </>
            ) : null}
          </div>
          {avatarError ? <p className="mt-2 text-xs font-medium text-red-500">{avatarError}</p> : null}
          <h1 className="mt-3 flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground">
            {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-foreground">
            <MapPin size={14} className="text-primary" />
            {user.homeGym}
          </p>
          {user.bio ? (
            <p className="mt-2 max-w-[18rem] text-pretty text-sm font-bold text-muted-foreground">
              {user.bio}
            </p>
          ) : null}
        </div>

        {/* Stats */}
        <div className="mt-4 grid w-full grid-cols-3 gap-3">
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

        {/* Favorite split */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Dumbbell size={20} />
          </span>
          <div className="flex-1 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Favorite Split
            </p>
            <p className="text-sm font-semibold text-card-foreground">{user.favoriteSplit}</p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            {isPremium ? <Clock size={20} /> : <Clock size={20} className="shrink-0" />}
          </span>
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
                  <label className="mt-4 block text-xs font-semibold text-muted-foreground">Favorite Split</label>
                  <input value={editFavoriteSplit} onChange={(event) => setEditFavoriteSplit(event.target.value)} placeholder="Push / Pull / Legs" className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none" />
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
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-lime text-sm font-bold text-lime-foreground shadow transition-colors hover:brightness-95"
                >
                  Edit Profile
                </button>
              
              )}
              <button
                type="button"
                onClick={openSettings}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow"
              >
                Settings
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
                    ? 'bg-red-500 text-white shadow hover:bg-red-600'
                    : 'bg-lime text-lime-foreground shadow hover:brightness-95',
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
              {followed && isPersistedProfile ? (
                <button type="button" disabled={startingDm !== null} onClick={() => void startDirectMessage(userId)}
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow disabled:opacity-50">
                  {startingDm === userId ? 'Opening…' : 'Message'}
                </button>
              ) : null}
              {connectionError ? (
                <p role="alert" className="mt-2 text-center text-sm font-medium text-red-500">
                  {connectionError}
                </p>
              ) : null}
              {isPersistedProfile ? (
                <SafetyActions
                  targetType="user"
                  targetId={userId}
                  targetName={user.name}
                  blockUserId={userId}
                  onBlocked={back}
                />
              ) : null}
            </div>
          )}
        </div>

        {/* Sign out (own profile) */}
        {isSelf ? (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-red-500 text-sm font-bold text-white shadow transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {signingOut ? 'Signing Out…' : 'Sign Out'}
          </button>
        ) : null}

        {/* Reliability & stats (Waits Pro) */}
        {!locked ? (
          <section className="mt-6">
            <h2 className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <BarChart3 size={14} className="justify-self-end" />
              <span className="text-center">Statistics</span>
              <TrendingUp size={14} className="justify-self-start" />
            </h2>
            {(isSelf ? user.isVerifiedPro === true : isPremium) ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-card p-4 text-center ring-1 ring-border">
                    <p className="flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground">
                      <ShieldCheck size={12} className="text-primary" />
                      Reliability
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-foreground">
                      {displayedReliability == null ? 'Not available' : `${displayedReliability}%`}
                    </p>
                    <p className="mx-auto mt-1 max-w-[10rem] text-pretty text-[11px] leading-relaxed text-muted-foreground">
                      Verified Attendance
                    </p>
                  </div>
                  <div className="rounded-2xl bg-card p-4 text-center ring-1 ring-border">
                    <p className="flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground">
                      <Flame size={12} className="text-primary" />
                      Streak
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-foreground">
                      {displayedStreak == null ? 'Not available' : `${displayedStreak} ${displayedStreak === 1 ? 'WEEK' : 'WEEKS'}`}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Consecutive Active Weeks</p>
                  </div>
                </div>
                {showingPreviewStats ? (
                  <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-primary">
                    Preview sample statistics
                  </p>
                ) : null}
              </>            ) : (
              <button
                type="button"
                onClick={() => openPaywall('Reliability & stats')}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-center ring-1 ring-border"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Lock size={18} />
                </span>
                <div className="flex-1 text-center">
                  <p className="text-sm font-bold text-card-foreground">See reliability &amp; streaks</p>
                  <p className="text-xs text-muted-foreground">
                    Attendance score &amp; weekly insights with Waits Pro.
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
            <h2 className="mb-3 flex items-center justify-center gap-2 px-1 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Images size={14} />
              Gym Gallery
              <Camera className="h-5 w-5" aria-hidden="true" />
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
                    POST PHOTOS WITH WAITS PRO
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-lime px-3 py-1 text-xs font-extrabold text-lime-foreground">
                    <Crown size={12} />
                    Unlock Gallery
                  </span>
                </div>
              </button>
            ) : gallery.length === 0 && !isSelf ? (
              <p className="rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground ring-1 ring-border">
                No Photos Yet.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {isSelf ? (
                  <>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleGalleryChange}
                      className="sr-only"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhoto}
                      disabled={galleryUploading}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
                      aria-label="Add photo"
                    >
                      <Plus size={22} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Add</span>
                    </button>
                  </>
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
                      <button type="button" onClick={() => void removeGalleryPhoto(src)} className="absolute bottom-1.5 right-1.5 rounded-full bg-destructive px-2 py-1 text-[10px] font-bold text-destructive-foreground shadow" aria-label="Remove photo">
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {scheduleLocked ? (
          <div className="mt-6 flex flex-col items-center rounded-3xl bg-card px-6 py-10 text-center ring-1 ring-border">
            <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Lock size={24} />
            </span>
            <h2 className="mt-3 text-base font-bold text-foreground">{locked ? 'This account is private' : 'Weekly Schedule Locked'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You and {user.name.split(' ')[0]} must follow each other to view their weekly schedule.
            </p>
          </div>
        ) : (
          <>
            {/* Weekly schedule */}
            <section className="mt-6">
              <h2 className="mb-3 px-1 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
        className="relative z-10 w-full touch-manipulation rounded-xl px-2 py-2 text-center hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary"
      >
        <p className="text-xl font-extrabold text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </button>
    )
  }
  return (
    <div className="w-full rounded-xl px-2 py-2 text-center">
      <p className="text-xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}
