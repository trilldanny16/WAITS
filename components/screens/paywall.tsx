'use client'

import { useState } from 'react'
import { X, Check, MessageCircle, Images, BarChart3, Users, Sparkles, Crown } from 'lucide-react'
import { useStore, FREE_PASS_TOTAL } from '../store'
import { useNav } from '../navigation'
import { PremiumCheckout } from '../premium-checkout'
import { PRO_PLAN } from '@/lib/products'

const PERKS = [
  { icon: MessageCircle, title: 'Crew chats', body: 'Message everyone in a workout you join or host.' },
  { icon: Images, title: 'See everyone’s gallery', body: 'Unlock other members’ gym progress photos.' },
  { icon: BarChart3, title: 'Reliability & stats', body: 'Attendance streaks, reliability score & weekly insights.' },
  { icon: Users, title: 'Bigger groups & unlimited workouts', body: 'Host up to 6 people and post as many sessions as you want.' },
  { icon: Sparkles, title: 'Pro profile', body: 'A Pro badge and a custom profile accent color.' },
]

function priceLabel() {
  const dollars = PRO_PLAN.priceInCents / 100
  return Number.isInteger(dollars) ? `$${dollars}/mo` : `$${dollars.toFixed(2)}/mo`
}

export function Paywall({ feature }: { feature?: string }) {
  const { setPremium, pushToast, passesRemaining } = useStore()
  const { back } = useNav()
  const [checkingOut, setCheckingOut] = useState(false)
  const outOfPasses = passesRemaining <= 0

  const handleSuccess = () => {
    setPremium(true)
    pushToast({ title: 'Welcome to Waits Pro 👑', body: 'All premium features are unlocked.' })
    back()
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
        <button
          type="button"
          onClick={back}
          className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <span className="text-base font-bold text-foreground">Waits Pro</span>
        <div className="w-9" />
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        {/* Hero */}
        <div className="flex flex-col items-center rounded-3xl bg-primary px-6 py-8 text-center text-primary-foreground">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-white/15">
            <Crown size={32} />
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
            {outOfPasses
              ? 'Your free passes are used up'
              : feature
                ? `Unlock ${feature}`
                : 'Go Pro'}
          </h1>
          <p className="mt-1 max-w-[20rem] text-pretty text-sm text-primary-foreground/80">
            {outOfPasses
              ? `You've used all ${FREE_PASS_TOTAL} free Pro passes. Subscribe for unlimited access to everything below.`
              : `You get ${FREE_PASS_TOTAL} free Pro passes to try everything. Subscribe anytime for unlimited access — no limits.`}
          </p>

          {/* Free-pass meter */}
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: FREE_PASS_TOTAL }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-5 rounded-full ${
                  i < passesRemaining ? 'bg-white' : 'bg-white/25'
                }`}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs font-semibold text-primary-foreground/80">
            {passesRemaining} of {FREE_PASS_TOTAL} free passes left
          </p>

          <p className="mt-4 text-3xl font-extrabold">
            {priceLabel()}
            <span className="text-base font-semibold text-primary-foreground/70"> billed monthly</span>
          </p>
        </div>

        {/* Perks */}
        <ul className="mt-5 space-y-2.5">
          {PERKS.map((perk) => (
            <li
              key={perk.title}
              className="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <perk.icon size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-card-foreground">{perk.title}</p>
                <p className="text-xs text-muted-foreground">{perk.body}</p>
              </div>
              <Check size={18} className="ml-auto mt-0.5 shrink-0 text-primary" strokeWidth={3} />
            </li>
          ))}
        </ul>

        {/* Checkout */}
        {checkingOut ? (
          <div className="mt-6">
            <PremiumCheckout onSuccess={handleSuccess} />
          </div>
        ) : null}
      </div>

      {/* Sticky CTA */}
      {!checkingOut ? (
        <div className="shrink-0 border-t border-border bg-card/95 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setCheckingOut(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime py-4 text-base font-extrabold text-lime-foreground transition-transform active:scale-[0.98]"
          >
            <Crown size={20} />
            Upgrade for {priceLabel()}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Cancel anytime · Secure checkout by Stripe
          </p>
        </div>
      ) : null}
    </div>
  )
}
