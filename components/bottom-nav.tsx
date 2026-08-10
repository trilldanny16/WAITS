'use client'

import { Home, Search, Plus, MessageCircle, User } from 'lucide-react'
import { useNav, type Tab } from './navigation'
import { cn } from '@/lib/utils'
import { useStore } from './store'

const ITEMS: { tab: Tab; label: string; icon: typeof Home }[] = [
  { tab: 'home', label: 'Feed', icon: Home },
  { tab: 'search', label: 'Search', icon: Search },
  { tab: 'create', label: 'Create', icon: Plus },
  { tab: 'chats', label: 'Chats', icon: MessageCircle },
  { tab: 'profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const { tab, setTab, openCreate } = useNav()
  const { pendingFriendRequestCount, refreshSocialState } = useStore()

  return (
    <nav
      aria-label="Primary"
      className="relative z-30 flex shrink-0 items-stretch justify-around border-t border-border bg-card/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur"
    >
      {ITEMS.map(({ tab: t, label, icon: Icon }) => {
        if (t === 'create') {
          return (
            <button
              key={t}
              type="button"
              onClick={openCreate}
              aria-label="Create workout"
              className="flex flex-1 flex-col items-center justify-center"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-lime text-lime-foreground shadow-md shadow-lime/40 transition-transform active:scale-90">
                <Icon size={26} strokeWidth={2.6} />
              </span>
            </button>
          )
        }
        const active = tab === t
        return (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t)
              if (t === 'chats') void refreshSocialState()
            }}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[10px] font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <span className="relative">
              <Icon size={23} strokeWidth={active ? 2.6 : 2} />
              {t === 'chats' && pendingFriendRequestCount > 0 ? (
                <span className="absolute -right-2 -top-2 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold leading-4 text-white">
                  {pendingFriendRequestCount > 9 ? '9+' : pendingFriendRequestCount}
                </span>
              ) : null}
            </span>
            {label}
          </button>
        )
      })}
    </nav>
  )
}
