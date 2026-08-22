import { Clock } from 'lucide-react'
import { PairedDumbbells } from './paired-dumbbells'
import { cn } from '@/lib/utils'

/**
 * Original WAITS wordmark with a second matching dumbbell.
 */
export function Wordmark({
  className,
  iconSize = 22,
  strokeWidth = 2.4,
}: {
  className?: string
  iconSize?: number
  strokeWidth?: number
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-black uppercase tracking-tight', className)}>
      <Clock size={iconSize} strokeWidth={strokeWidth} className="shrink-0" aria-hidden="true" />
      <span className="tracking-[0.06em]">WAITS</span>
      <PairedDumbbells size={iconSize} strokeWidth={strokeWidth} />
      <span className="sr-only">Waits — never lift alone</span>
    </span>
  )
}
