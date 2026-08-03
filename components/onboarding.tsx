'use client'

import { useState } from 'react'
import { Apple, Mail, Check, Dumbbell, ArrowRight, Phone, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Wordmark } from './wordmark'
import { savePhoneLead } from '@/app/actions/phone-leads'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.71z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  )
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<0 | 1>(0)
  const [days, setDays] = useState<string[]>(['Mon', 'Wed', 'Fri'])

  const [phone, setPhone] = useState('')
  const [phoneStatus, setPhoneStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const toggleDay = (d: string) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))

  const submitPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneStatus === 'saving') return
    setPhoneError(null)
    setPhoneStatus('saving')
    const result = await savePhoneLead(phone)
    if (result.ok) {
      setPhoneStatus('saved')
    } else {
      setPhoneStatus('idle')
      setPhoneError(result.error)
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-primary text-primary-foreground">
      {/* Hero */}
      <div className="flex flex-1 flex-col justify-center px-7">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-lime text-lime-foreground shadow-lg">
          <Dumbbell size={34} strokeWidth={2.4} />
        </span>

        {step === 0 ? (
          <div className="mt-7 animate-in fade-in slide-in-from-bottom-4">
            <Wordmark iconSize={34} strokeWidth={2.6} className="text-balance text-4xl leading-[1.05] gap-3" />
            <p className="mt-3 max-w-[16rem] text-lg font-medium text-primary-foreground/80">
              Never lift alone. See when your friends train and join with one tap.
            </p>

            {/* Phone capture */}
            <div className="mt-7 rounded-3xl bg-white/10 p-4">
              {phoneStatus === 'saved' ? (
                <div className="flex items-center gap-2.5 py-1.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-lime text-lime-foreground">
                    <Check size={16} strokeWidth={3} />
                  </span>
                  <p className="text-sm font-semibold text-primary-foreground">
                    You&apos;re all set. Your free account is ready to go.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="phone"
                      className="text-sm font-semibold text-primary-foreground"
                    >
                      Sign up with your phone
                    </label>
                    <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-lime-foreground">
                      Free
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-primary-foreground/65">
                    Enter your number to create your free account. No cost, ever.
                  </p>
                  <form onSubmit={submitPhone} className="mt-3 flex gap-2">
                    <div className="relative flex-1">
                      <Phone
                        size={18}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/60"
                      />
                      <input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-12 w-full rounded-xl border border-white/20 bg-white/5 pl-10 pr-3 text-base font-medium text-primary-foreground placeholder:text-primary-foreground/45 outline-none focus:border-lime focus:ring-2 focus:ring-lime/40"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={phoneStatus === 'saving'}
                      className="flex h-12 min-w-12 items-center justify-center rounded-xl bg-lime px-4 text-sm font-bold text-lime-foreground transition-transform active:scale-95 disabled:opacity-70"
                      aria-label="Save phone number"
                    >
                      {phoneStatus === 'saving' ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <ArrowRight size={20} strokeWidth={2.6} />
                      )}
                    </button>
                  </form>
                  {phoneError ? (
                    <p className="mt-2 text-xs font-medium text-lime">{phoneError}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-7 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight">
              Set your weekly rhythm
            </h1>
            <p className="mt-2 max-w-[17rem] text-base font-medium text-primary-foreground/80">
              Pick the days you usually train so friends know when to come thru.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const on = days.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors',
                      on
                        ? 'bg-lime text-lime-foreground'
                        : 'bg-white/10 text-primary-foreground',
                    )}
                  >
                    {on ? <Check size={15} strokeWidth={3} /> : null}
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 px-7 pb-[calc(env(safe-area-inset-bottom)+28px)]">
        {step === 0 ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white py-3.5 text-base font-semibold text-black transition-transform active:scale-[0.98]"
            >
              <Apple size={20} className="-mt-0.5" fill="currentColor" />
              Continue with Apple
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white py-3.5 text-base font-semibold text-black transition-transform active:scale-[0.98]"
            >
              <GoogleGlyph />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/25 py-3.5 text-base font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              <Mail size={19} />
              Sign up with Email
            </button>
            <p className="pt-1 text-center text-xs text-primary-foreground/55">
              By continuing you agree to our Terms & Privacy Policy.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onDone}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime py-4 text-base font-bold text-lime-foreground transition-transform active:scale-[0.98]"
          >
            Enter Waits
            <ArrowRight size={20} strokeWidth={2.6} />
          </button>
        )}
      </div>
    </div>
  )
}
