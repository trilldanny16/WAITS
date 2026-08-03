import type { User } from '@/lib/types'
import { cn } from '@/lib/utils'

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function Avatar({
  user,
  size = 44,
  className,
  ring = false,
}: {
  user: User
  size?: number
  className?: string
  ring?: boolean
}) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar || "/placeholder.svg"}
        alt={user.name}
        width={size}
        height={size}
        className={cn(
          'shrink-0 rounded-full object-cover',
          ring && 'ring-2 ring-lime',
          className,
        )}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        ring && 'ring-2 ring-lime',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${user.hue} 70% 52%), hsl(${
          (user.hue + 28) % 360
        } 72% 42%))`,
      }}
      aria-hidden="true"
    >
      {initials(user.name)}
    </div>
  )
}
