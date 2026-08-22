'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type Tab = 'home' | 'search' | 'create' | 'chats' | 'profile'

export type Overlay =
  | { type: 'workout'; id: string }
  | { type: 'chat'; id: string }
  | { type: 'dm'; id: string }
  | { type: 'user'; id: string }
  | { type: 'create' }
  | { type: 'community' }
  | { type: 'paywall'; feature?: string }
  | { type: 'settings' }

interface NavValue {
  tab: Tab
  overlays: Overlay[]
  setTab: (tab: Tab) => void
  openWorkout: (id: string) => void
  openChat: (id: string) => void
  openDm: (id: string) => void
  openUser: (id: string) => void
  openCreate: () => void
  openCommunity: () => void
  openPaywall: (feature?: string) => void
  openSettings: () => void
  back: () => void
  closeAll: () => void
}

const NavContext = createContext<NavValue | null>(null)

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>('home')
  const [overlays, setOverlays] = useState<Overlay[]>([])

  const setTab = useCallback((t: Tab) => {
    setOverlays([])
    setTabState(t)
  }, [])

  const openWorkout = useCallback((id: string) => {
    setOverlays((prev) => [...prev, { type: 'workout', id }])
  }, [])
  const openChat = useCallback((id: string) => {
    setOverlays((prev) => [...prev, { type: 'chat', id }])
  }, [])
  const openDm = useCallback((id: string) => {
    setOverlays((prev) => [...prev, { type: 'dm', id }])
  }, [])
  const openUser = useCallback((id: string) => {
    setOverlays((prev) => [...prev, { type: 'user', id }])
  }, [])
  const openCreate = useCallback(() => {
    setOverlays((prev) => [...prev, { type: 'create' }])
  }, [])
  const openCommunity = useCallback(() => {
    setOverlays((prev) => [...prev, { type: 'community' }])
  }, [])
  const openPaywall = useCallback((feature?: string) => {
    setOverlays((prev) => [...prev, { type: 'paywall', feature }])
  }, [])
  const openSettings = useCallback(() => {
    setOverlays((prev) => [...prev, { type: 'settings' }])
  }, [])
  const back = useCallback(() => {
    setOverlays((prev) => prev.slice(0, -1))
  }, [])
  const closeAll = useCallback(() => setOverlays([]), [])

  return (
    <NavContext.Provider
      value={{
        tab,
        overlays,
        setTab,
        openWorkout,
        openChat,
    openDm,
        openUser,
        openCreate,
        openCommunity,
        openPaywall,
        openSettings,
        back,
        closeAll,
      }}
    >
      {children}
    </NavContext.Provider>
  )
}

export function useNav(): NavValue {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}
