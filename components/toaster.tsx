'use client'

import { Bell, X } from 'lucide-react'
import { useStore } from './store'

export function Toaster() {
  const { toasts, dismissToast } = useStore()

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-3 pt-3"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-foreground/95 px-4 py-3 text-left text-background shadow-lg backdrop-blur animate-in slide-in-from-top-4 fade-in"
        >
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground">
            <Bell size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-tight">{t.title}</span>
            {t.body ? (
              <span className="mt-0.5 block text-xs leading-snug opacity-80">{t.body}</span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label={`Dismiss notification: ${t.title}`}
            className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-background/75 transition-colors hover:bg-background/10 hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          >
            <X size={17} strokeWidth={2.5} />
          </button>
        </div>
      ))}
    </div>
  )
}
