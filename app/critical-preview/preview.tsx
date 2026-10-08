'use client'

import { useState } from 'react'
import { ChevronLeft, FileText, HelpCircle, ShieldCheck } from 'lucide-react'
import { SignInBrand, SignInLegal, SignInOptions } from '@/components/onboarding'
import { AccountSettingsContainer } from '@/components/screens/settings-billing'

export function CriticalDesignPreview() {
  const [pro, setPro] = useState(false)
  const [small, setSmall] = useState(false)
  const [notice, setNotice] = useState('')
  const explain = (action: string) => setNotice(`${action}: design preview only. No authentication, billing, profile edits, or sign-out are performed here.`)
  return <main className="min-h-dvh bg-black px-4 py-6 text-white">
    <h1 className="text-xl font-bold">WAITS Sign-In &amp; Settings Preview</h1>
    <p className="mt-2 max-w-3xl text-sm text-white/60">Actual shared web sign-in and account components. This is not a verified iPhone screenshot or purchase test. Native sign-in uses the existing bundled clock logo; the Apple button remains the official native control.</p>
    <div className="my-4 flex flex-wrap gap-3"><button onClick={() => setPro(value => !value)} className="min-h-11 rounded-full bg-white/10 px-4">{pro ? 'Show Free membership' : 'Show Pro membership'}</button><button onClick={() => setSmall(value => !value)} className="min-h-11 rounded-full bg-white/10 px-4">{small ? 'Large layout' : 'Small layout'}</button><a href="/messaging-preview" className="inline-flex min-h-11 items-center rounded-full bg-primary/15 px-4 text-primary">Messaging preview</a></div>
    {notice ? <p role="status" className="mb-4 text-sm text-white/70">{notice}</p> : null}
    <div className="flex gap-6 overflow-x-auto pb-6">
      <section className={small ? 'w-[320px] shrink-0' : 'w-[390px] shrink-0'}><h2 className="mb-3 text-sm text-white/60">Sign-in</h2><div className={small ? 'h-[568px] overflow-y-auto rounded-[28px] bg-[#0088FF] px-6 pb-5 pt-10' : 'h-[844px] overflow-y-auto rounded-[28px] bg-[#0088FF] px-6 pb-5 pt-10'}><SignInBrand /><div className="mt-8"><SignInOptions onApple={() => explain('Apple sign-in')} onGoogle={() => explain('Google sign-in')} onEmail={() => explain('Email sign-in')} /></div><div className="mt-5"><SignInLegal /></div></div></section>
      <section className={small ? 'w-[320px] shrink-0' : 'w-[390px] shrink-0'}><h2 className="mb-3 text-sm text-white/60">Settings &amp; Billing</h2><div className={small ? 'h-[568px] overflow-y-auto rounded-[28px] border border-white/15 px-5 pb-5 pt-8' : 'h-[844px] overflow-y-auto rounded-[28px] border border-white/15 px-5 pb-5 pt-8'}><header className="flex items-center gap-3"><button aria-label="Back" onClick={() => explain('Back')} className="flex size-11 items-center justify-center rounded-full bg-secondary"><ChevronLeft size={21} /></button><div><h3 className="text-lg font-extrabold">Settings &amp; Billing</h3><p className="text-xs text-muted-foreground">Membership, policies, and help</p></div></header><AccountSettingsContainer isPremium={pro} onBilling={() => explain(pro ? 'Manage Subscription' : 'View Pro Plans')} onEditProfile={() => explain('Edit Profile')} onSignOut={() => explain('Sign Out')} /><h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Legal &amp; Privacy</h3><div className="rounded-3xl bg-card px-4 ring-1 ring-border"><a href="/privacy" className="flex min-h-14 items-center gap-3 border-b border-border"><ShieldCheck size={19} />Privacy Policy</a><a href="/terms" className="flex min-h-14 items-center gap-3"><FileText size={19} />Terms of Service</a></div><h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Help &amp; Account</h3><div className="flex min-h-14 items-center gap-3 rounded-3xl bg-card px-4 ring-1 ring-border"><HelpCircle size={19} />Contact Support</div></div></section>
    </div>
  </main>
}
