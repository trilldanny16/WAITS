'use client'

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'

// Stable public entry point: never share preview URLs, session tokens, or profile data.
const APP_URL = 'https://come-thru-gym-bud.vercel.app/'

export function ShareWaitsButton() {
  const busy = useRef(false)
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState('')
  const [showLink, setShowLink] = useState(false)

  async function shareApp() {
    if (busy.current) return
    busy.current = true
    setSharing(true)
    setMessage('')
    setShowLink(false)
    try {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: 'WAITS',
            text: 'Train with friends or meet new workout partners. Join me on WAITS!',
            url: APP_URL,
          })
          return
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return
          // Unsupported or blocked sharing falls back to copying the public link.
        }
      }
      try {
        await navigator.clipboard.writeText(APP_URL)
        setMessage('WAITS link copied. Paste it into a message!')
      } catch {
        setShowLink(true)
        setMessage('Select and copy the link below to share WAITS.')
      }
    } finally {
      busy.current = false
      setSharing(false)
    }
  }

  return (
    <div className="relative size-11 shrink-0">
      <button
        type="button"
        onClick={() => void shareApp()}
        disabled={sharing}
        aria-label="Share WAITS"
        title="Share WAITS"
        aria-busy={sharing}
        className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
      >
        <Upload size={24} aria-hidden="true" />
      </button>
      <p role="status" aria-live="polite" className="sr-only">{message}</p>
      {message ? (
        <div className="absolute left-0 top-14 z-50 w-64 rounded-2xl bg-card p-3 text-sm text-card-foreground shadow-lg ring-1 ring-border">
          <p>{message}</p>
          {showLink ? (
            <input
              aria-label="WAITS app link"
              readOnly
              value={APP_URL}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
          ) : null}
          <button type="button" onClick={() => { setMessage(''); setShowLink(false) }} className="mt-2 min-h-11 w-full rounded-xl bg-accent font-bold text-accent-foreground">
            Done
          </button>
        </div>
      ) : null}
    </div>
  )
}
