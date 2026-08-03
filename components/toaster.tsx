'use client'

import { Bell } from 'lucide-react'
import { useStore } from './store'

export function Toaster() {
  const { toasts, dismissToast } = useStore()

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-3 pt-3">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-foreground/95 px-4 py-3 text-left text-background shadow-lg backdrop-blur animate-in slide-in-from-top-4 fade-in"
        >
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground">
            <Bell size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight">{t.title}</span>
            {t.body ? (
              <span className="mt-0.5 block text-xs leading-snug opacity-80">{t.body}</span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  )
}
