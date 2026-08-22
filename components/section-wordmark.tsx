import { Clock, Dumbbell } from 'lucide-react'

export function SectionWordmark({ children }: { children: string }) {
  return (
    <h1 className="inline-flex items-center gap-2 text-lg font-black uppercase tracking-[0.06em] text-primary">
      <Clock size={18} strokeWidth={2.4} className="shrink-0" aria-hidden="true" />
      <span>{children}</span>
      <Dumbbell size={18} strokeWidth={2.4} className="shrink-0" aria-hidden="true" />
    </h1>
  )
}

