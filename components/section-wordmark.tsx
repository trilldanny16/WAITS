import { BrandMark } from './brand-mark'

export function SectionWordmark({ children }: { children: string }) {
  return (
    <h1 className="inline-flex items-center gap-2 text-lg font-black uppercase tracking-[0.06em] text-primary">
      <BrandMark size={24} />
      <span>{children}</span>
    </h1>
  )
}
