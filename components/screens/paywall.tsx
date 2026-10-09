'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Check, MessageCircle, Images, BarChart3, Users, Sparkles, Crown } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { PremiumCheckout } from '../premium-checkout'
import { PRO_PLAN } from '@/lib/products'

const PERKS = [
  { icon: MessageCircle, title: 'Start Personal DMs', body: 'Private conversations between connected Pro members. Pro is required to read, send, and reply.' },
  { icon: Images, title: 'See Everyone’s Gallery', body: 'Unlock other members’ gym progress photos.' },
  { icon: BarChart3, title: 'Reliability & Stats', body: 'Attendance streaks, reliability score & weekly insights.' },
  { icon: Users, title: 'Larger Workout Groups', body: 'Host more people with expanded participant capacity.' },
  { icon: Sparkles, title: 'Pro Profile', body: 'A Pro badge and a custom profile accent color.' },
]

function priceLabel() {
  return `$${(PRO_PLAN.priceInCents / 100).toFixed(2)}/mo`
}

export function Paywall({ feature }: { feature?: string }) {
  const { pushToast } = useStore()
  const { back } = useNav()
  const [checkingOut, setCheckingOut] = useState(false)
  const [isNativeIOS, setIsNativeIOS] = useState<boolean | null>(null)
  const nativePaywallOpened = useRef(false)

  useEffect(() => {
    const nativeIOS = Boolean(window.ReactNativeWebView) || /WAITS-iOS/i.test(navigator.userAgent)
    setIsNativeIOS(nativeIOS)
    if (nativeIOS && window.ReactNativeWebView && !nativePaywallOpened.current) {
      nativePaywallOpened.current = true
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WAITS_NATIVE_OPEN_PAYWALL' }))
    }
  }, [])

  const startUpgrade = () => {
    if (window.ReactNativeWebView || /WAITS-iOS/i.test(navigator.userAgent)) {
      const nativeWebView = window as typeof window & {
        ReactNativeWebView?: { postMessage: (message: string) => void }
      }
      if (!nativeWebView.ReactNativeWebView) {
        pushToast({ title: 'Apple purchase screen unavailable', body: 'Please reopen WAITS. No web checkout was started.' })
        return
      }
      nativeWebView.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WAITS_NATIVE_OPEN_PAYWALL' }))
      return
    }
    setCheckingOut(true)
  }

  const handleSuccess = () => {
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'WAITS_ENTITLEMENT_CHANGED' } }))
    pushToast({ title: 'Checking your membership', body: 'Pro access updates after the server confirms your subscription.' })
    back()
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
        <button type="button" onClick={back} className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground" aria-label="Close">
          <X size={20} />
        </button>
        <span className="text-base font-extrabold tracking-wide text-primary">WAITS PRO</span>
        <div className="w-11" />
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        <div className="flex flex-col items-center rounded-3xl border border-primary/30 bg-primary/10 px-5 py-6 text-center text-white">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Crown size={26} /></span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Train with more possibilities.</h1>
          <p className="mt-1 max-w-[20rem] text-pretty text-sm text-primary-foreground/80">
            {feature && feature !== 'WAITS Pro' ? `${feature} and more with WAITS Pro.` : 'Your training network, unlocked.'}
          </p>
          {isNativeIOS === false ? <p className="mt-4 text-3xl font-extrabold">{priceLabel()}</p> : null}
          <p className="mt-2 text-sm text-white/80">{isNativeIOS === null ? 'Loading billing options…' : isNativeIOS ? 'Select your plan in the Apple purchase screen.' : 'Billed monthly. Cancel anytime.'}</p>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">Workout Chats are included with Free for hosts and people who join.</p>

        <ul className="mt-5 space-y-2.5">
          {PERKS.map((perk) => (
            <li key={perk.title} className="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><perk.icon size={18} /></span>
              <div>
                <p className="text-sm font-bold text-card-foreground">{perk.title}</p>
                <p className="text-xs text-muted-foreground">{perk.body}</p>
              </div>
              <Check size={18} className="ml-auto mt-0.5 shrink-0 text-primary" strokeWidth={3} />
            </li>
          ))}
        </ul>

        {checkingOut ? <div className="mt-6"><PremiumCheckout onSuccess={handleSuccess} /></div> : null}
      </div>

      {!checkingOut ? (
        <div className="shrink-0 border-t border-border bg-card/95 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
          <button type="button" disabled={isNativeIOS === null} onClick={startUpgrade} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime py-4 text-base font-extrabold text-lime-foreground transition-transform active:scale-[0.98] disabled:opacity-60">
            <Crown size={20} />
            {isNativeIOS === null ? 'Loading Plans…' : isNativeIOS ? 'View Pro Plans' : `Upgrade For ${priceLabel()}`}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {isNativeIOS === null ? 'Checking your platform' : isNativeIOS ? 'Secure purchase through Apple · Restore Purchases available' : 'Cancel anytime · Secure checkout by Stripe'}
          </p>
          <div className="mt-2 flex items-center justify-center gap-5 text-xs text-muted-foreground"><a href="/terms" className="inline-flex min-h-11 items-center underline underline-offset-2">Terms of Service</a><a href="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-2">Privacy Policy</a></div>
        </div>
      ) : null}
    </div>
  )
}
