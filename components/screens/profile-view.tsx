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
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [editName, setEditName] = useState(user.name)
  const [editHomeGym, setEditHomeGym] = useState(user.homeGym)
  const [editCity, setEditCity] = useState(user.city)
  const [editBio, setEditBio] = useState(user.bio)
  const [editFavoriteSplit, setEditFavoriteSplit] = useState(user.favoriteSplit)
  const [editError, setEditError] = useState<string | null>(null)

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
    const extension = extensionByType[file.type]
    const path = `${currentUserId}/avatar-${Date.now()}.${extension}`
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
  const [socialListKind, setSocialListKind] = useState<'followers' | 'following' | null>(null)
  const [viewedConnectionCount, setViewedConnectionCount] = useState(0)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [friendRequestState, setFriendRequestState] = useState<FriendRequestState>('none')
  const [sendingRequest, setSendingRequest] = useState(false)

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

  const hostedWorkouts = useMemo(
    () => workouts.filter((workout) => workout.hostId === userId),
    [workouts, userId],
  )

  const scheduledWorkouts = useMemo(
    () =>
      workouts
        .filter((workout) => workout.hostId === userId || workout.attendees.includes(userId))
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
        </div>�]t��h�������ƭy������������𽑥��4(����������������耠4(��������������������ѽ�4(���������������������������ѽ��4(�������������������������젤����͕�%���ѥ�����Ք��4(�����������������������9�����ܵ�ձ��ɽչ�����ᰁ���͕�����������́ѕ�еʹ����е�����ѕ�е͕������䵙�ɕ�ɽչ��4(�����������������4(��������������������ЁAɽ����4(���������������������ѽ��4(��������������4(����������������4(������������������ѽ�4(�����������ѽ��4(��������������M���=���4(�������9������д́ܵ�ձ��ɽչ�����ᰁ��ɑ�ȁ��ɑ�ȵɕ������������́ѕ�еʹ����е�����ѕ�еɕ������4(�4(��M����=��4(�����ѽ��4(������������𽑥��4(4(������������4(������������耠4(�����������������4(������������������ѽ�4(�������������������������ѽ��4(�����������������������홽���ݕ�4(���������������������������͍������4(������������������聙ɥ���I��Օ��Mхє���􀝹����4(������������������������������ɥ���4(��������������������聙ɥ���I��Օ��Mхє�������������}��ѝ�����4(�����������������������������������I��Օ��4(������������������������չ��������4(������������������ͅ������4(��������������������͍�����ѥ�����4(������������������͕�����I��Օ�Ё��4(�������������������������ݕ�������ɥ���I��Օ��Mхє�������������}��������������ɥ���I��Օ��Mхє���􀝅����ѕ����4(�����������������4(���������������������9����퍸�4(������������������������ܵ�ձ���ѕ�̵���ѕȁ���ѥ�䵍��ѕȁ����ȁɽչ�����ᰁ���́ѕ�еʹ����е������Ʌ�ͥѥ��������́��ͅ�����������������4(�����������������������ݕ�4(�������������������������ɑ�ȁ��ɑ�ȵɕ�����������������ɽչ��ѕ�еɕ������4(��������������������耝���͕��������ѕ�е͕������䵙�ɕ�ɽչ���4(������������������4(���������������4(����������������홽���ݕ�����4(��������������������4(���������������������`�ͥ����������ɽ��]��Ѡ�������4(��������������������푥͍�����ѥ������U������ݥ�������耝U������ܝ�4(���������������������4(������������������耠4(��������������������4(���������������������U͕�A��́ͥ����������4(���������������������͕�����I��Օ��4(�������������������������ɥ���I��Օ��Mхє�������������}��ѝ����������������������耝M����������4(����������������������聙ɥ���I��Օ��Mхє�������������}��ѝ�����4(���������������������������������I��Օ�М4(����������������������聙ɥ���I��Օ��Mхє�������������}���������4(���������������������������I��Օ�ЁI����ٕ��4(������������������������聙ɥ���I��Օ��Mхє���􀝅����ѕ��4(����������������������������������ѕ��4(��������������������������耝����ܝ�4(���������������������4(������������������4(�������������������ѽ��4(��������������퍽����ѥ���ɽȀ���4(�������������������ɽ��􉅱��Ј������9������дȁѕ�е���ѕȁѕ�еʹ����е����մ�ѕ�еɕ�������4(������������������퍽����ѥ���ɽ��4(��������������������4(����������������聹ձ��4(������������𽑥��4(������������4(��������𽑥��4(4(��������켨�]���́Aɼ����Ʌ������х��̀��ݸ��ɽ���������4(�����������M�������4(������������Aɕ��մ����4(���������������؁�����9������д́���eѕ�̵���ѕȁ����́ɽչ�����ᰁ����ɥ�������Ёѕ�е�ɥ���䵙�ɕ�ɽչ���4(���������������ɽݸ�ͥ������􁍱���9�����͡ɥ��������4(�����������������؁�����9���􉙱���Ĉ�4(������������������������9�����ѕ�еʹ����е���Ʌ������]���́Aɼ�����������4(������������������������9�����ѕ�е�́ѕ�е�ɥ���䵙�ɕ�ɽչ������4(������������������ɕ܁����̰������ɥ�̰��х�̀����쁵�ɔ��ɔ�չ�������4(��������������������4(��������������𽑥��4(������������𽑥��4(������������耠4(����������������ѽ�4(�����������������������ѽ��4(���������������������젤��������A��݅�����4(�������������������9������д́�����ܵ�ձ���ѕ�̵���ѕȁ���ѥ�䵍��ѕȁ����́ɽչ�����ᰁ����ɥ�������Ёѕ�е�ɥ���䵙�ɕ�ɽչ��4(�������������4(���������������ɽݸ�ͥ������􁍱���9�����͡ɥ��������4(�����������������؁�����9���􉙱���āѕ�е���ѕȈ�4(������������������������9�����ѕ�е��͔����е���Ʌ������Ʌ������ѥ��Ј�U��Ʌ���Ѽ�]���́Aɼ����4(������������������������9������дāѕ�е�́ѕ�е�ɥ���䵙�ɕ�ɽչ������4(������������������ɕ܁����̰����Ѽ������ɥ�̰�ɕ�����������х�̰��ь�4(��������������������4(��������������𽑥��4(���������������ɽݸ�ͥ������􁍱���9�����͡ɥ��������4(�����������������ѽ��4(�����������4(����������聹ձ��4(4(��������켨��ٽɥє�����Ѐ���4(�����������؁�����9������дЁ���eѕ�̵���ѕȁ����́ɽչ�����ᰁ�����ɐ���Ёɥ���āɥ�����ɑ�Ȉ�4(���������������������9���􉙱���ͥ锴����ѕ�̵���ѕȁ���ѥ�䵍��ѕȁɽչ����ᰁ��������Ёѕ�е�����е��ɕ�ɽչ���4(�������������յ������ͥ����������4(�����������������4(�������������؁�����9���􉙱���āѕ�е���ѕȈ�(��������������������9�����ѕ�е�́���е���������ɍ�͔��Ʌ������ݥ���Ёѕ�е��ѕ����ɕ�ɽչ���4(���������������ٽɥє�M����4(����������������4(��������������������9�����ѕ�еʹ����е͕�������ѕ�е��ɐ���ɕ�ɽչ�����͕ȹ��ٽɥѕM���������(����������𽑥��(�����������������ɥ������������Ք�������9�����ͥ锴���͡ɥ��������(��������𽑥��4(4(��������켨�I���������䀘��х�̀�]���́Aɼ�����4(��������셱���������4(�����������͕�ѥ��������9������д؈�4(��������������ȁ�����9���􉵈�́���eѕ�̵���ѕȁ����ȁ���āѕ�е�́���е���������ɍ�͔��Ʌ������ݥ���Ёѕ�е��ѕ����ɕ�ɽչ���4(���������������	������́ͥ����������4(��������������I���������䀙�����Mх��4(�����������������4(������������졥�M�������͕ȹ��Y�ɥ����Aɼ�������Ք�聥�Aɕ��մ�����4(�����������������؁�����9������ɥ���ɥ�����̴ȁ����Ȉ�4(�������������������؁�����9�����ɽչ�����ᰁ�����ɐ���Ёɥ���āɥ�����ɑ�Ȉ�4(��������������������������9�����ѕ�е�́���е͕�������ѕ�е��ѕ����ɕ�ɽչ���I��������������4(��������������������������9������дāѕ�д�ᰁ���е���Ʌ�����ѕ�е��ɕ�ɽչ���4(����������������������͕ȹɕ��������������ձ�����9�Ё�م��������聀���͕ȹɕ�������������4(����������������������4(��������������������������9�����ѕ�еl����t�ѕ�е��ѕ����ɕ�ɽչ�����͕ȹɕ��������������ձ�����I��եɕٕ́ɥ�����ݽɭ��Ё������ѥ����������͡�܁�ٕ��̸��耝	�͕�����ٕɥ�������ѕ�������������4(����������������𽑥��4(�������������������؁�����9�����ɽչ�����ᰁ�����ɐ���Ёɥ���āɥ�����ɑ�Ȉ�4(��������������������������9���􉙱�eѕ�̵���ѕȁ����āѕ�е�́���е͕�������ѕ�е��ѕ����ɕ�ɽչ���4(��������������������������ͥ������􁍱���9�����ѕ�е�ɥ���䈀��4(��������������������M�ɕ��4(����������������������4(��������������������������9������дāѕ�д�ᰁ���е���Ʌ�����ѕ�е��ɕ�ɽչ���4(����������������������͕ȹ��ɕ�������ձ�����9�Ё�م��������聀���͕ȹ��ɕ����ݭ́�4(����������������������4(��������������������������9�����ѕ�еl����t�ѕ�е��ѕ����ɕ�ɽչ�����͕��ѥٔ���ѥٔ�ݕ�������4(����������������𽑥��4(��������������𽑥��4(��������������耠4(������������������ѽ�4(�������������������������ѽ��4(�����������������������젤��������A��݅����I���������䀘��х�̜��4(���������������������9���􉙱���ܵ�ձ���ѕ�̵���ѕȁ����́ɽչ�����ᰁ�����ɐ���Ёѕ�е���Ёɥ���āɥ�����ɑ�Ȉ4(���������������4(���������������������������9���􉙱���ͥ锴����ѕ�̵���ѕȁ���ѥ�䵍��ѕȁɽչ����ᰁ��������Ёѕ�е�����е��ɕ�ɽչ���4(�������������������1����ͥ����������4(�����������������������4(�������������������؁�����9���􉙱���Ĉ�4(��������������������������9�����ѕ�еʹ����е�����ѕ�е��ɐ���ɕ�ɽչ���M���ɕ��������䀙�������ɕ�������4(��������������������������9�����ѕ�е�́ѕ�е��ѕ����ɕ�ɽչ���4(���������������������ѕ�������͍�ɔ�����ݕ���䁥�ͥ���́ݥѠ�]���́Aɼ�4(����������������������4(����������������𽑥��4(�����������������ɽݸ�ͥ������􁍱���9�����͡ɥ�����ѕ�е�ɥ���䈀��4(�������������������ѽ��4(��������������4(������������͕�ѥ���4(����������聹ձ��4(4(��������켨�A��Ѽ�������䀨��4(��������셱���������4(�����������͕�ѥ��������9������д؈�4(��������������ȁ�����9���􉵈�́���eѕ�̵���ѕȁ����ȁ���āѕ�е�́���е���������ɍ�͔��Ʌ������ݥ���Ёѕ�е��ѕ����ɕ�ɽչ���4(���������������%����́ͥ����������4(��������������崁������4(�����������������4(4(������������흅�����1���������4(������������������ѽ�4(�������������������������ѽ��4(�����������������������젤��������A��݅����A��Ѽ������ɥ�̜��4(���������������������9�����ɕ��ѥٔ�������ܵ�ձ���ٕə��ܵ�������ɽչ�����ᰁɥ���āɥ�����ɑ�Ȉ4(���������������4(�������������������؁�����9������ɥ���ɥ�����̴́����Ĉ�4(������������������졝�����乱���Ѡ�����������������AIMQ}A!=Q=L�ͱ�������̤��ͱ�������̤�������Ɍ���������4(������������������������ͱ��е��ͅ�������е��������н���н��������������4(��������������������񥵜4(�����������������������������4(�����������������������Ɍ���Ɍ��ܽ����������ȹ�ٜ��4(����������������������������4(���������������������������9����������е��Յɔ�ܵ�ձ��͍�������������е��ٕȁ���ȵ���4(����������������������4(���������������������4(����������������𽑥��4(�������������������؁�����9���􉅉ͽ��є���͕д�����Y��്����ѕ�̵���ѕȁ���ѥ�䵍��ѕȁ����ȁ��������ɽչ���ԁѕ�е���ѕȁ�����ɽ�����ȵl���t��4(�����������������������������9���􉙱���ͥ锴�ȁ�ѕ�̵���ѕȁ���ѥ�䵍��ѕȁɽչ�����ձ������ɥ�����ѕ�е�ɥ���䵙�ɕ�ɽչ���4(���������������������1����ͥ����������4(�������������������������4(��������������������������9��������؁ѕ�еʹ����е�����ѕ�е��ɕ�ɽչ���4(��������������������M�����͕ȹ���������Р����l�u�������́���ѽ́ݥѠ�]���́Aɼ4(����������������������4(�����������������������������9���􉥹��������eѕ�̵���ѕȁ����āɽչ�����ձ�������������́���āѕ�е�́���е���Ʌ�����ѕ�е�������ɕ�ɽչ���4(���������������������ɽݸ�ͥ����������4(��������������������U������������4(�������������������������4(����������������𽑥��4(�������������������ѽ��4(��������������聝�����乱���Ѡ�������������M�������4(����������������������9�����ɽչ�����ᰁ�����ɐ���Ёѕ�еʹ�ѕ�е��ѕ����ɕ�ɽչ��ɥ���āɥ�����ɑ�Ȉ�4(����������������9�����ѽ́��и4(������������������4(��������������耠4(�����������������؁�����9������ɥ���ɥ�����̴́����ĸԈ�4(�������������������M�������4(����������������������ѽ�4(�����������������������������ѽ��4(����������������������������������A��ѽ�4(�������������������������9���􉙱�E����е��Յɔ����്����ѕ�̵���ѕȁ���ѥ�䵍��ѕȁ����āɽչ�����ᰁ��ɑ�ȴȁ��ɑ�ȵ��͡�����ɑ�ȵ��ɑ�ȁѕ�е��ѕ����ɕ�ɽչ���Ʌ�ͥѥ��������́��ٕ�鉽ɑ�ȵ�ɥ���䁡�ٕ��ѕ�е�ɥ�����4(���������������������ɥ���������������Ѽ�4(�������������������4(���������������������A��́ͥ����������4(�������������������������������9�����ѕ�еl����t����е���������ɍ�͔��Ʌ������ݥ�������������4(�����������������������ѽ��4(������������������聹ձ��4(����������������흅����乵�����Ɍ���������4(���������������������؁����퀑��ɍ�������􁍱���9�����ɕ��ѥٔ��ٕə��ܵ�������ɽչ�����ᰁɥ���āɥ�����ɑ�Ȉ�4(��������������������켨��ͱ��е��ͅ�������е��������н���н�������������Ѐ���4(��������������������񥵜4(�����������������������Ɍ���Ɍ��ܽ����������ȹ�ٜ��4(���������������������������崁���Ѽ�4(���������������������������9����������е��Յɔ�ܵ�ձ�������е��ٕȈ4(����������������������4(�����������������������M�������4(��������������������������ѽ�����������ѽ����������젤����ɕ��ٕ������A��Ѽ��Ɍ�􁍱���9���􉅉ͽ��є����ѽ��ĸԁɥ��дĸԁɽչ�����ձ����������Սѥٔ����ȁ���āѕ�еl����t����е�����ѕ�е�����Սѥٔ���ɕ�ɽչ��͡���܈��ɥ���������I���ٔ����Ѽ��4(������������������������I���ٔ4(���������������������������ѽ��4(����������������������聹ձ��4(������������������𽑥��4(�������������������4(��������������𽑥��4(��������������4(������������͕�ѥ���4(����������聹ձ��4(4(�����������������4(�������������؁�����9������д؁���Y��്����ѕ�̵���ѕȁɽչ�����ᰁ�����ɐ����؁������ѕ�е���ѕȁɥ���āɥ�����ɑ�Ȉ�4(�����������������������9���􉙱���ͥ锴�Ё�ѕ�̵���ѕȁ���ѥ�䵍��ѕȁɽչ�����ձ�����͕��������ѕ�е��ѕ����ɕ�ɽչ���4(���������������1����ͥ����������4(�������������������4(��������������ȁ�����9������д́ѕ�е��͔����е�����ѕ�е��ɕ�ɽչ���Q��́����չЁ�́�ɥمє�����4(��������������������9������дāѕ�еʹ�ѕ�е��ѕ����ɕ�ɽչ���4(������������������܁��͕ȹ���������Р����l�u��Ѽ�͕��ѡ��ȁݕ�����͍���ձ������ݽɭ���̸4(����������������4(����������𽑥��4(����������耠4(������������4(������������켨�]������͍���ձ�����4(�������������͕�ѥ��������9������д؈�4(����������������ȁ�����9���􉵈�́���āѕ�е�́���е���������ɍ�͔��Ʌ������ݥ���Ёѕ�е��ѕ����ɕ�ɽչ���4(����������������]������M����ձ�4(�������������������4(�����������������؁�����9�������������ĸԁɽչ�����ᰁ�����ɐ���́ɥ���āɥ�����ɑ�Ȉ�4(�����������������]-}1	1L��������������������4(����������������������Ё�ѕ�̀��ݕ��5��m�t4(������������������ɕ��ɸ��4(�����������������������؁��������􁍱���9���􉙱�eѕ�̵���ѕȁ����̈�4(���������������������������������9�����ܴ��͡ɥ�����ѕ�е���ѕȁѕ�е�́���е�����ѕ�е��ѕ����ɕ�ɽչ���4(�������������������������]-}1	1Mm�u�4(�����������������������������4(�������������������������؁�����9���􉙱�u�����䁙����ā������Ʌ���ѕ�̵���ѕȁ����ĸԈ�4(��������������������������ѕ�̹����Ѡ����������4(�������������������������������������9�����ѕ�е�́ѕ�е��ѕ����ɕ�ɽչ������I����������4(��������������������������耠4(���������������������������ѕ�̹�����ܤ�����4(��������������������������������ѽ�4(�����������������������������������ܹ���4(���������������������������������������ѽ��4(�������������������������������������젤��������]�ɭ��Сܹ����4(�����������������������������������9���􉥹��������eѕ�̵���ѕȁ����ĸԁɽչ�����ձ�������������ȸԁ���āѕ�е�́���е�����ѕ�е�������ɕ�ɽչ��4(�����������������������������4(�������������������������������]�ɭ���Q���%����������ܹ�����l�u��ͥ����������4(�������������������������������ܹ����̹�������������
܁홽ɵ��Q����ܹѥ����4(���������������������������������ѽ��4(����������������������������4(��������������������������4(����������������������𽑥��4(��������������������𽑥��4(�������������������4(�������������������4(��������������𽑥��4(��������������͕�ѥ���4(4(������������켨�U��������ݽɭ���̀���4(�������������͍���ձ��]�ɭ���̹����Ѡ��������4(���������������͕�ѥ��������9������д؈�4(������������������ȁ�����9���􉵈�́���āѕ�е�́���е���������ɍ�͔��Ʌ������ݥ���Ёѕ�е��ѕ����ɕ�ɽչ���4(������������������U��������]�ɭ����4(���������������������4(�������������������؁�����9�������������̈�4(�������������������͍���ձ��]�ɭ���̹�����ܤ�����4(���������������������]�ɭ����ɐ������ܹ����ݽɭ����������4(���������������������4(����������������𽑥��4(����������������͕�ѥ���4(��������������聹ձ��4(�������������4(����������4(������𽑥��4(����𽑥��4(���4)�4(4)�չ�ѥ���MхС��م�Ք���������������������م�Ք聹յ���쁱��������ɥ��쁽������耠�����ٽ�������4(���������������4(����ɕ��ɸ��4(����������ѽ�4(�����������������ѽ��4(���������������������4(�������������9�����ɕ��ѥٔ����������ܴ���ѽՍ�������ձ�ѥ���ɽչ����ᰁ���ȁ���ȁѕ�е���ѕȁ��ٕ�鉜�͕������䁙���̵٥ͥ����ɥ���ȁ����̵٥ͥ����ɥ����ɥ�����4(�������4(����������������9�����ѕ�еᰁ���е���Ʌ�����ѕ�е��ɕ�ɽչ����م�Օ�����4(����������������9�����ѕ�е�́���е����մ�ѕ�е��ѕ����ɕ�ɽչ������������4(�����������ѽ��4(�����4(���4(��ɕ��ɸ��4(�������؁�����9�����ѕ�е���ѕȈ�4(��������������9�����ѕ�еᰁ���е���Ʌ�����ѕ�е��ɕ�ɽչ����م�Օ�����4(��������������9�����ѕ�е�́���е����մ�ѕ�е��ѕ����ɕ�ɽչ������������4(����𽑥��4(���4)�4(