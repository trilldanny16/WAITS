'use client'

import { useEffect, useState } from 'react'
import { Wifi } from 'lucide-react'

function currentTime() {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())
}

export function IosStatusBar() {
  const [time, setTime] = useState('9:41')

  useEffect(() => {
    const updateTime = () => setTime(currentTime())
    updateTime()
    const timer = window.setInterval(updateTime, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div
      className="relative z-50 flex h-9 shrink-0 items-center justify-between bg-background px-6 text-foreground"
      aria-label="iOS status bar"
    >
      <span className="w-20 text-center text-[13px] font-semibold tracking-tight">{time}</span>

      <span className="absolute left-1/2 top-1/2 h-[22px] w-[86px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black">
        <span className="absolute right-[7px] top-1/2 size-[6px] -translate-y-1/2 rounded-full bg-[#182536] ring-1 ring-[#31445d]" />
      </span>

      <span className="flex w-20 items-center justify-end gap-1.5" aria-hidden="true">
        <span className="flex h-3 items-end gap-[1.5px]">
          <span className="h-[4px] w-[3px] rounded-[1px] bg-current" />
          <span className="h-[6px] w-[3px] rounded-[1px] bg-current" />
          <span className="h-[9px] w-[3px] rounded-[1px] bg-current" />
          <span className="h-3 w-[3px] rounded-[1px] bg-current" />
        </span>
        <Wifi size={15} strokeWidth={2.6} />
        <span className="relative h-[11px] w-[21px] rounded-[3px] border-[1.5px] border-current p-[1.5px]">
          <span className="block h-full w-[82%] rounded-[1px] bg-current" />
          <span className="absolute -right-[3px] top-1/2 h-[5px] w-[1.5px] -translate-y-1/2 rounded-r bg-current/60" />
        </span>
      </span>
    </div>
  )
}
