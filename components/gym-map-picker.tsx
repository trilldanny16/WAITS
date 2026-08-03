'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker } from 'leaflet'
import { Search, MapPin, Loader2, LocateFixed } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'

export interface GymLocation {
  name: string
  city: string
  lat: number
  lng: number
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  name?: string
  address?: Record<string, string>
}

// Default center: Boynton Beach, FL
const DEFAULT_CENTER: [number, number] = [26.5254, -80.0664]
const PIN_COLOR = '#0a84ff'

function toLocation(r: NominatimResult): GymLocation {
  const a = r.address ?? {}
  const city =
    a.city || a.town || a.village || a.hamlet || a.suburb || a.county || ''
  const name =
    r.name && r.name.length > 0 ? r.name : (r.display_name?.split(',')[0] ?? 'Selected location')
  return { name, city, lat: Number.parseFloat(r.lat), lng: Number.parseFloat(r.lon) }
}

// Read-only mini map used to show a workout's saved location.
export function GymMapPreview({ lat, lng }: { lat: number; lng: number }) {
  const el = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !el.current || mapRef.current) return
      const map = L.map(el.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
      })
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { maxZoom: 20, subdomains: 'abcd' },
      ).addTo(map)
      const icon = L.divIcon({
        className: 'ct-pin',
        html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:${PIN_COLOR};box-shadow:0 4px 12px rgba(10,132,255,.45);border:3px solid #fff"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
      L.marker([lat, lng], { icon }).addTo(map)
      mapRef.current = map
      setTimeout(() => map.invalidateSize(), 100)
      setTimeout(() => map.invalidateSize(), 500)
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [lat, lng])

  return <div ref={el} className="h-40 w-full" aria-label="Gym location map" />
}

export function GymMapPicker({
  value,
  onChange,
}: {
  value: GymLocation | null
  onChange: (loc: GymLocation) => void
}) {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const justSelected = useRef(false)

  // Place or move the marker and recenter the map.
  const placeMarker = useCallback((lat: number, lng: number, fly = true) => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map) return
    if (!markerRef.current) {
      const icon = L.divIcon({
        className: 'ct-pin',
        html: `<span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:${PIN_COLOR};box-shadow:0 4px 12px rgba(10,132,255,.45);border:3px solid #fff"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map)
    } else {
      markerRef.current.setLatLng([lat, lng])
    }
    if (fly) map.flyTo([lat, lng], 15, { duration: 0.6 })
  }, [])

  // Reverse geocode a tapped point on the map.
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } },
        )
        const data = (await res.json()) as NominatimResult
        onChange(toLocation(data))
      } catch {
        onChange({ name: 'Dropped pin', city: '', lat, lng })
      }
    },
    [onChange],
  )

  // Initialize the Leaflet map once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !mapEl.current || mapRef.current) return
      leafletRef.current = L
      const start: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER
      const map = L.map(mapEl.current, {
        center: start,
        zoom: value ? 15 : 12,
        zoomControl: false,
        attributionControl: true,
      })
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 20,
          subdomains: 'abcd',
        },
      ).addTo(map)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      mapRef.current = map
      if (value) placeMarker(value.lat, value.lng, false)
      // Ensure correct sizing inside the scrollable sheet.
      setTimeout(() => map.invalidateSize(), 100)
      setTimeout(() => map.invalidateSize(), 500)
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced geocoding search.
  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false
      return
    }
    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(
            q,
          )}`,
          { headers: { 'Accept-Language': 'en' } },
        )
        const data = (await res.json()) as NominatimResult[]
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 450)
    return () => clearTimeout(t)
  }, [query])

  const selectResult = (r: NominatimResult) => {
    const loc = toLocation(r)
    justSelected.current = true
    onChange(loc)
    placeMarker(loc.lat, loc.lng, true)
    setResults([])
    setQuery(loc.name)
  }

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        placeMarker(latitude, longitude, true)
        void reverseGeocode(latitude, longitude)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a gym, address, or city"
            className="h-12 w-full rounded-2xl bg-card pl-11 pr-10 text-base font-medium text-card-foreground outline-none ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
          />
          {searching ? (
            <Loader2
              size={18}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
            />
          ) : null}
        </div>

        {/* Results dropdown */}
        {results.length > 0 ? (
          <ul className="absolute z-[500] mt-2 w-full overflow-hidden rounded-2xl bg-popover shadow-lg ring-1 ring-border">
            {results.map((r, i) => {
              const loc = toLocation(r)
              return (
                <li key={`${r.lat}-${r.lon}-${i}`}>
                  <button
                    type="button"
                    onClick={() => selectResult(r)}
                    className="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-secondary"
                  >
                    <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-popover-foreground">
                        {loc.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.display_name}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      {/* Map */}
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-border">
        <div ref={mapEl} className="h-52 w-full" aria-label="Gym location map" />
        <button
          type="button"
          onClick={useMyLocation}
          className="absolute left-3 top-3 z-[500] flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-2 text-xs font-semibold text-card-foreground shadow-md ring-1 ring-border backdrop-blur active:scale-95"
        >
          {locating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LocateFixed size={14} className="text-primary" />
          )}
          Near me
        </button>
      </div>

      {/* Selected location */}
      <div
        className={cn(
          'flex items-center gap-3 rounded-2xl px-4 py-3 ring-1',
          value ? 'bg-accent ring-accent-foreground/20' : 'bg-card ring-border',
        )}
      >
        <MapPin size={18} className={value ? 'text-accent-foreground' : 'text-muted-foreground'} />
        <div className="min-w-0">
          {value ? (
            <>
              <p className="truncate text-sm font-bold text-accent-foreground">{value.name}</p>
              <p className="truncate text-xs text-accent-foreground/70">
                {value.city ? value.city : `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">
              Search for a gym or use your location
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
