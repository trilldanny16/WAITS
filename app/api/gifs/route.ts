import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type GiphyItem = {
  id: string
  title?: string
  images?: {
    fixed_width?: { url?: string }
    downsized_medium?: { url?: string }
    original?: { url?: string }
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.GIPHY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GIF search is being connected. Try again shortly.' }, { status: 503 })
  }

  const query = request.nextUrl.searchParams.get('q')?.trim().slice(0, 80) ?? ''
  const endpoint = query ? 'search' : 'trending'
  const url = new URL(`https://api.giphy.com/v1/gifs/${endpoint}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('limit', '24')
  url.searchParams.set('rating', 'pg-13')
  url.searchParams.set('bundle', 'messaging_non_clips')
  if (query) url.searchParams.set('q', query)

  try {
    const response = await fetch(url, { next: { revalidate: query ? 0 : 300 } })
    if (!response.ok) throw new Error(`GIPHY returned ${response.status}`)
    const body = await response.json() as { data?: GiphyItem[] }
    const gifs = (body.data ?? []).flatMap((item) => {
      const previewUrl = item.images?.fixed_width?.url
      const originalUrl = item.images?.downsized_medium?.url ?? item.images?.original?.url
      return previewUrl && originalUrl ? [{
        id: item.id,
        title: item.title ?? '',
        previewUrl,
        originalUrl,
      }] : []
    })
    return NextResponse.json({ gifs })
  } catch {
    return NextResponse.json({ error: 'GIF search is temporarily unavailable.' }, { status: 502 })
  }
}
