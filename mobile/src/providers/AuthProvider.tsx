import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
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

  const loadProfile = async (userId?: string) => {
    const id = userId ?? session?.user.id
    if (!id) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id,display_name,home_gym,city,onboarding_completed,is_pro')
      .eq('id', id)
      .maybeSingle<MobileProfile>()
    setProfile(data ?? null)
  }

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) {
        await Promise.all([
          loadProfile(data.session.user.id),
          identifyAdaptyUser(data.session.user.id),
        ])
      }
      if (active) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) setProfile(null)
      else {
        void loadProfile(nextSession.user.id)
        void identifyAdaptyUser(nextSession.user.id)
      }
      setLoading(false)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile: () => loadProfile(),
    signOut: async () => { await supabase.auth.signOut() },
  }), [session, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}

