'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

const ALLOWED_CHAT_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_CHAT_MEDIA_BYTES = 8 * 1024 * 1024

export type ChatMediaKind = 'image' | 'gif'

export async function uploadChatMedia(file: File, userId: string) {
  if (!ALLOWED_CHAT_MEDIA.has(file.type)) {
    return { ok: false as const, error: 'Choose a JPG, PNG, WebP, or GIF image.' }
  }
  if (file.size > MAX_CHAT_MEDIA_BYTES) {
    return { ok: false as const, error: 'Chat images must be 8 MB or smaller.' }
  }

  const extensionByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const extension = extensionByType[file.type]
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('chat-media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return { ok: false as const, error: error.message }

  return {
    ok: true as const,
    path,
    kind: (file.type === 'image/gif' ? 'gif' : 'image') as ChatMediaKind,
  }
}

export async function removeChatMedia(path: string) {
  await supabase.storage.from('chat-media').remove([path])
}

export function ChatMedia({ path, alt = 'Shared chat image' }: { path: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data, error } = await supabase.storage.from('chat-media').createSignedUrl(path, 3600)
      if (active && !error) setUrl(data.signedUrl)
    }
    void load()
    return () => { active = false }
  }, [path])

  if (!url) {
    return <div className="mt-2 aspect-video w-full animate-pulse rounded-2xl bg-secondary" aria-label="Loading shared image" />
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="mt-2 max-h-72 w-full rounded-2xl object-cover ring-1 ring-border" />
}
