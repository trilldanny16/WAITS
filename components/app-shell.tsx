'use client'

import { useState } from 'react'
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
import { CommunityChat } from './screens/community-chat'
import { Paywall } from './screens/paywall'
import { useStore } from './store'

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
        {top.type === 'community' && <CommunityChat />}
        {top.type === 'paywall' && <Paywall feature={top.feature} />}
        {top.type === 'user' && <ProfileView userId={top.id} />}
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
  const [onboarded, setOnboarded] = useState(false)

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-neutral-200 dark:bg-black md:py-6">
      <div className="relative flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-2xl md:h-[900px] md:max-h-[calc(100dvh-3rem)] md:rounded-[3rem] md:ring-1 md:ring-black/10">
        {!onboarded ? (
          <Onboarding onDone={() => setOnboarded(true)} />
        ) : (
          <StoreProvider>
            <NavProvider>
              <Inner />
            </NavProvider>
          </StoreProvider>
        )}
      </div>
    </div>
  )
}
