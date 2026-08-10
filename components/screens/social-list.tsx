'use client'

import { ChevronLeft, Users } from 'lucide-react'
import { Avatar } from '../avatar'
import { useNav } from '../navigation'
import { useStore } from '../store'

export function SocialList({
  userId,
  kind,
}: {
  userId: string
  kind: 'followers' | 'following'
}) {
  const { currentUserId, followers, following, getUser } = useStore()
  const { back, openUser } = useNav()
  const isSelf = userId === currentUserId
  const ids = isSelf ? (kind === 'followers' ? followers : following) : []
  const title = kind === 'followers' ? 'Followers' : 'Following'

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
        <button
          type="button"
          onClick={back}
          className="flex h-9 items-center gap-1 rounded-full bg-secondary px-3 text-sm font-bold text-secondary-foreground"
          aria-label="Back"
        >
          <ChevronLeft size={20} /> Back
        </button>
        <h1 className="text-lg font-extrabold text-foreground">{title}</h1>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
        {!isSelf ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
            Other members&apos; connection lists are private.
          </p>
        ) : ids.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex size-16 items-center justify-center rounded-3xl bg-secondary text-muted-foreground">
              <Users size={28} />
            </span>
            <p className="mt-4 text-sm font-semibold text-foreground">No connections yet</p>
            <p className="mt-1 max-w-64 text-sm text-muted-foreground">
              Accepted friend requests appear here for both people.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {ids.map((id) => {
              const user = getUser(id)
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => openUser(id)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-border"
                  >
                    <Avatar user={user} size={46} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-card-foreground">{user.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">@{user.username}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
