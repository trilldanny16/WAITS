import { Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PairedDumbbells({
  size = 24,
  strokeWidth = 2.4,
  className,
}: {
  size?: number
  strokeWidth?: number
  className?: string
}) {
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Dumbbell size={size} strokeWidth={strokeWidth} className="absolute inset-0" />
      <Dumbbell size={size} strokeWidth={strokeWidth} className="absolute inset-0 -scale-x-100" />
    </span>
  )
}
