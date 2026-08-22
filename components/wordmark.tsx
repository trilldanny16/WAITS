import { BrandMark } from './brand-mark'
import { cn } from '@/lib/utils'

/**
 * WAITS wordmark: two weights inside a handless clock for the weights/wait wordplay.
 */
export function Wordmark({
  className,
  iconSize = 24,
}: {
  className?: string
  iconSize?: number
  strokeWidth?: number
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-black uppercase tracking-tight', className)}>
      <BrandMark size={iconSize} />
      <span className="tracking-[0.06em]">WAITS</span>
      <span className="sr-only">Waits — never lift alone</span>
    </span>
  )
}
