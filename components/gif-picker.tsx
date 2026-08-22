'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'

export type GifResult = {
  id: string
  title: string
  previewUrl: string
  originalUrl: string
}

export function GifPicker({ onClose, onSelect }: {
  onClose: () => void
  onSelect: (gif: GifResult) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GifResult[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/gifs?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        const body = await response.json() as { gifs?: GifResult[]; error?: string }
        if (!response.ok) throw new Error(body.error || 'GIF search is unavailable.')
        setResults(body.gifs ?? [])
      } catch (searchError) {
        if ((searchError as Error).name !== 'AbortError') setError((searchError as Error).message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, query ? 350 : 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return (
    <section className="absolute inset-x-0 bottom-0 z-30 flex max-h-[68%] flex-col rounded-t-[28px] border-t border-border bg-card shadow-2xl" aria-label="GIF search">
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
        <button type="button" onClick={onClose} aria-label="Close GIF search" className="absolute right-4 top-3 flex size-8 items-center justify-center rounded-full bg-secondary">
          <X size={17} />
        </button>
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-2xl bg-secondary px-3">
          <Search size={17} className="text-muted-foreground" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search GIPHY" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground">{query ? 'Search results' : 'Trending GIFs'}</p>
          <p className="text-[10px] font-black tracking-wide text-muted-foreground">POWERED BY GIPHY</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        {loading ? <div className="flex h-36 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div> : null}
        {error ? <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-center text-sm font-medium text-destructive">{error}</p> : null}
        {!loading && !error ? (
          <div className="grid grid-cols-2 gap-1.5">
            {results.map((gif) => (
              <button key={gif.id} type="button" disabled={Boolean(sendingId)} onClick={async () => {
                setSendingId(gif.id)
                try { await onSelect(gif) } finally { setSendingId(null) }
              }} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary disabled:opacity-50" aria-label={`Send GIF: ${gif.title || 'GIF'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gif.previewUrl} alt={gif.title || 'GIF'} className="h-full w-full object-cover" />
                {sendingId === gif.id ? <span className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="animate-spin text-white" /></span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
