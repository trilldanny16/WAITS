import { cn } from '@/lib/utils'

export function BrandMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {/* Handless clock face: the four ticks carry the time theme without reading as clock hands. */}
      <circle cx="16" cy="16" r="13" opacity=".42" />
      <path d="M16 3v2M29 16h-2M16 29v-2M3 16h2" opacity=".65" />

      {/* Two separate dumbbells make the weights/WAITS wordplay unmistakably plural. */}
      <path d="M8 11h16M8 21h16" />
      <path d="M8 8.5v5M11 9.5v3M21 9.5v3M24 8.5v5" />
      <path d="M8 18.5v5M11 19.5v3M21 19.5v3M24 18.5v5" />
    </svg>
  )
}
