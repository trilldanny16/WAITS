import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'

export type OnboardingPrivacy = 'Public' | 'Followers' | 'Mutual'
export type OnboardingDraft = {
  displayName: string
  username: string
  hometown: string
  bio: string
  favoriteWorkout: string
  weeklyDays: string[]
  typicalTime: string
  privacy: OnboardingPrivacy
  notificationsEnabled: boolean
}

export const ONBOARDING_DRAFT_KEY = 'waits:onboarding:draft:v1'
// Replay the approved six-page flow once after older beta installations update.
// Keep the draft key unchanged so saved user input survives that update.
export const ONBOARDING_SEEN_KEY = 'waits:onboarding:seen:v3-high-five-six-pages'
const onboardingAppliedKey = (userId: string) => `waits:onboarding:applied:${userId}`
export const emptyOnboardingDraft: OnboardingDraft = {
  displayName: '', username: '', hometown: '', bio: '', favoriteWorkout: '',
  weeklyDays: [], typicalTime: '', privacy: 'Mutual', notificationsEnabled: false,
}

export async function loadOnboardingDraft() {
  const raw = await AsyncStorage.getItem(ONBOARDING_DRAFT_KEY)
  if (!raw) return emptyOnboardingDraft
  try { return { ...emptyOnboardingDraft, ...JSON.parse(raw) } as OnboardingDraft }
  catch { return emptyOnboardingDraft }
}
export const saveOnboardingDraft = (draft: OnboardingDraft) => AsyncStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft))
export const markOnboardingSeen = () => AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true')

export async function completePendingOnboarding(userId: string) {
  if (await AsyncStorage.getItem(onboardingAppliedKey(userId)) === 'true') return
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) throw profileError
  // A draft is first-time setup input, never a replacement for an existing profile.
  if (profile?.onboarding_completed) {
    await AsyncStorage.setItem(onboardingAppliedKey(userId), 'true')
    return
  }
  const draft = await loadOnboardingDraft()
  if (!draft.displayName.trim() || !draft.hometown.trim()) return
  const weeklyRhythm = [...draft.weeklyDays, draft.typicalTime].filter(Boolean).join(' · ')
  const { error: metadataError } = await supabase.auth.updateUser({
    data: { username: draft.username.replace(/^@/, ''), schedule_privacy: draft.privacy.toLowerCase() },
  })
  if (metadataError) throw metadataError
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: draft.displayName.trim(),
    city: draft.hometown.trim(),
    bio: draft.bio.trim(),
    favorite_split: draft.favoriteWorkout.trim() || 'Not set',
    weekly_rhythm: weeklyRhythm || null,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (error) throw error
  await AsyncStorage.setItem(onboardingAppliedKey(userId), 'true')
}
