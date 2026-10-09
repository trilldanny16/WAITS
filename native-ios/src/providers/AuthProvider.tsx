import type { Session, User } from '@supabase/supabase-js'
import { AppState } from 'react-native'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { identifyAdaptyUser } from '@/lib/adapty'
import { supabase } from '@/lib/supabase'

export type MobileProfile = {
  id: string
  display_name: string | null
  home_gym: string | null
  city: string | null
  onboarding_completed: boolean
  is_pro: boolean
}

type AuthState = {
  session: Session | null
  user: User | null
  profile: MobileProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<MobileProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const currentUserId = useRef<string | null>(null)

  const loadProfile = useCallback(async (userId?: string) => {
    const id = userId ?? currentUserId.current
    if (!id) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id,display_name,home_gym,city,onboarding_completed,is_pro')
      .eq('id', id)
      .maybeSingle<MobileProfile>()
    if (currentUserId.current === id) setProfile(data ?? null)
  }, [])

  useEffect(() => {
    let active = true
    let authEventReceived = false
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active || authEventReceived) return
      currentUserId.current = data.session?.user.id ?? null
      setSession(data.session)
      if (data.session) {
        await Promise.all([
          loadProfile(data.session.user.id),
          identifyAdaptyUser(data.session.user.id).catch(() => console.warn('Purchase account could not initialize. Purchases remain unavailable until retry.')),
        ])
      } else await identifyAdaptyUser(null).catch(() => undefined)
      if (active) setLoading(false)
    }).catch(() => { if (active) setLoading(false) })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true
      const identityChanged = currentUserId.current !== (nextSession?.user.id ?? null)
      currentUserId.current = nextSession?.user.id ?? null
      setSession(nextSession)
      if (identityChanged) setProfile(null)
      void identifyAdaptyUser(nextSession?.user.id ?? null).catch(() => console.warn('Purchase account could not initialize.'))
      if (!nextSession) setProfile(null)
      else {
        void loadProfile(nextSession.user.id)
      }
      setLoading(false)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  useEffect(() => {
    // Re-read the server-authoritative entitlement after returning from StoreKit
    // or reopening the app; client SDK state is not authorization.
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadProfile().catch(() => undefined)
    })
    return () => foreground.remove()
  }, [loadProfile])

  const value = useMemo<AuthState>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile: () => loadProfile(),
    signOut: async () => {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        setLoading(false)
        throw error
      }
    },
  }), [session, profile, loading, loadProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
