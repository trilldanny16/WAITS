'use client'

import { ProfileSetup } from './profile-setup'
import { useCallback, useEffect, useState } from 'react'
import { StoreProvider } from './store'
import { NavProvider, useNav } from './navigation'
import { BottomNav } from './bottom-nav'
import { Toaster } from './toaster'
import { Onboarding } from './onboarding'
import { HomeFeed } from './screens/home-feed'
import { Search } from './screens/search'
import { ChatsList } from './screens/chats-list'
import { ProfileView } from './screens/profile-view'
import { CreateWorkout } from './screens/create-workout'
import { WorkoutDetail } from './screens/workout-detail'
import { Chat } from './screens/chat'
import { DirectMessage } from './screens/direct-message'
import { CommunityChat } from './screens/community-chat'
import { Paywall } from './screens/paywall'
import { SettingsBilling } from './screens/settings-billing'
import { useStore } from './store'
import { supabase } from '@/lib/supabase-client'
import { IosStatusBar } from './ios-status-bar'

function ActiveTab() {
  const { tab } = useNav()
  const { currentUserId } = useStore()
  switch (tab) {
    case 'home':
      return <HomeFeed />
    case 'search':
      return <Search />
    case 'chats':
      return <ChatsList />
    case 'profile':
      return <ProfileView userId={currentUserId} asTab />
    default:
      return <HomeFeed />
  }
}

function Overlays() {
  const { overlays } = useNav()
  if (overlays.length === 0) return null
  const top = overlays[overlays.length - 1]
  return (
    <div className="absolute inset-0 z-40 animate-in slide-in-from-right-6 fade-in duration-200">
      <div className="h-full bg-background">
        {top.type === 'create' && <CreateWorkout />}
        {top.type === 'workout' && <WorkoutDetail id={top.id} />}
        {top.type === 'chat' && <Chat id={top.id} />}
        {top.type === 'dm' && <DirectMessage id={top.id} />}
        {top.type === 'community' && <CommunityChat />}
        {top.type === 'paywall' && <Paywall feature={top.feature} />}
        {top.type === 'user' && <ProfileView userId={top.id} />}
        {top.type === 'settings' && <SettingsBilling />}
      </div>
    </div>
  )
}

function Inner() {
  return (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <ActiveTab />
      </div>
      <BottomNav />
      <Overlays />
      <Toaster />
    </>
  )
}
export function AppShell() {
  const [stage, setStage] = useState<
    'loading' | 'onboarding' | 'profile' | 'app' | 'error'
  >('loading')

  const loadUserStage = useCallback(async () => {
    setStage('loading')

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      setStage('error')
      return
    }

    if (!session) {
      setStage('onboarding')
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setStage('error')
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed, display_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      setStage('error')
      return
    }

    if (!profile?.onboarding_completed) {
      setStage('onboarding')
      return
    }

    if (!profile.display_name) {
      setStage('profile')
      return
    }

    setStage('app')
  }, [])

  useEffect(() => {
    void loadUserStage()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setStage('onboarding')
        return
      }

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        window.setTimeout(() => void loadUserStage(), 0)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadUserStage])

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-neutral-200 dark:bg-black md:py-6">
      <div className="relative flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-2xl md:h-[900px] md:max-h-[calc(100dvh-3rem)] md:rounded-[3rem] md:ring-1 md:ring-black/10">
        <IosStatusBar />
        <div className="relative flex min-h-0 flex-1 flex-col">
        {stage === 'loading' ? (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">
            Checking your session…
          </div>
        ) : stage === 'error' ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-base font-bold text-foreground">We couldn&apos;t verify your session.</p>
            <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => void loadUserStage()}
              className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              Try Again
            </button>
          </div>
        ) : stage === 'onboarding' ? (
          <Onboarding onDone={loadUserStage} />
        ) : stage === 'profile' ? (
          <ProfileSetup onContinue={loadUserStage} />
        ) : (
          <StoreProvider>
            <NavProvider>
              <Inner />
            </NavProvider>
          </StoreProvider>
        )}
        </div>
      </div>
    </div>
  )
}
