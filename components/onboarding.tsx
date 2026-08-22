'use client'

import { useEffect, useState } from 'react'
import {
  Apple,
  Mail,
  Check,
  Clock,
  Dumbbell,
  ArrowRight,
  ArrowLeft,
  Phone,
  Loader2,
} from 'lucide-react'

import { savePhoneLead } from '@/app/actions/phone-leads'
import { supabase } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type AuthMode = 'signup' | 'signin'

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
  const [phoneStatus, setPhoneStatus] =
    useState<'idle' | 'saving' | 'saved'>('idle')
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const [showEmailForm, setShowEmailForm] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (!mounted) return

const signedIn = Boolean(data.session)
setHasSession(signedIn)

if (data.session?.user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', data.session.user.id)
    .single()

  if (profile?.onboarding_completed) {
    onDone()
  } else {
    setStep(1)
  }
}
    }

    void checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return

      const signedIn = Boolean(session)
      setHasSession(signedIn)

      if (session?.user) {
        void supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (!mounted) return
            if (profile?.onboarding_completed) onDone()
            else setStep(1)
          })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [onDone])

  const toggleDay = (day: string) => {
    setDays((previousDays) =>
      previousDays.includes(day)
        ? previousDays.filter((existingDay) => existingDay !== day)
        : [...previousDays, day],
    )
  }

  const submitPhone = async (event: React.FormEvent) => {
    event.preventDefault()

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

  const handleEmailAuth = async () => {
    setAuthError(null)
    setAuthMessage(null)

    if (!email.trim()) {
      setAuthError('Enter your email address.')
      return
    }

    if (password.length < 6) {
      setAuthError('Your password must be at least 6 characters.')
      return
    }

    setAuthLoading(true)

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })

        if (error) {
          setAuthError(error.message)
          return
        }

        if (data.session) {
          setHasSession(true)
          setStep(1)
        } else {
          setAuthMessage(
            'Check your email and click the confirmation link to finish signing up.',
          )
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) {
          setAuthError(error.message)
          return
        }

if (data.session?.user) {
  setHasSession(true)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', data.session.user.id)
    .single()

  if (profileError) {
    setAuthError(profileError.message)
    return
  }

  if (profile?.onboarding_completed) {
    onDone()
    return
  }

  setStep(1)
}
      }
    } catch {
      setAuthError('Something went wrong. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setAuthError(null)
    setAuthMessage(null)
    setAuthLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthError(error.message)
      setAuthLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    setAuthError(null)
    setAuthMessage(null)
    setAuthLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthError(
        error.message.toLowerCase().includes('provider')
          ? 'Apple sign-in is not configured yet.'
          : error.message,
      )
      setAuthLoading(false)
    }
  }

 const handleEnterWaits = async () => {
  if (!hasSession) {
    setAuthError('You must sign in before entering WAITS.')
    setStep(0)
    return
  }

  setAuthError(null)
  setAuthLoading(true)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    setAuthError('Your login session could not be verified.')
    setAuthLoading(false)
    return
  }

const { error } = await supabase
  .from('profiles')
  .upsert(
    {
      id: user.id,
      email: user.email,
      weekly_rhythm: days,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    },
  )

  if (error) {
    setAuthError(error.message)
    setAuthLoading(false)
    return
  }

  setAuthLoading(false)
  onDone()
}

  return (
    <div className="relative flex h-full flex-col bg-primary text-primary-foreground">
      {step === 1 ? (
        <div className="flex shrink-0 items-center px-7 pt-[calc(env(safe-area-inset-top)+16px)]">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition-colors hover:bg-white/15"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col justify-center overflow-y-auto px-7">
        {step === 0 ? (
          <div className="my-7 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex size-16 items-center justify-center rounded-3xl bg-lime text-lime-foreground shadow-lg">
                <span className="flex items-center -space-x-1" aria-hidden="true"><Dumbbell size={28} strokeWidth={2.6} /><Dumbbell size={28} strokeWidth={2.6} /></span>
              </span>

              <span className="text-balance text-4xl font-black uppercase tracking-[0.06em]">
                WAITS
              </span>
            </div>

            <p className="mx-auto mt-3 max-w-[16rem] text-center text-lg font-medium text-primary-foreground/80">
              <span className="block">Never lift alone.</span>
              <span className="block">Train with friends.</span>
              <span className="block">Join in with one tap.</span>
            </p>

            <div className="mt-7 rounded-3xl bg-white/10 p-4">
              {phoneStatus === 'saved' ? (
                <div className="flex items-center gap-2.5 py-1.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-lime text-lime-foreground">
                    <Check size={16} strokeWidth={3} />
                  </span>

                  <p className="text-sm font-semibold text-primary-foreground">
                    Your phone number was saved.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="phone"
                      className="text-sm font-semibold text-primary-foreground"
                    >
                      Join with your phone
                    </label>

                    <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-lime-foreground">
                      Free
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-primary-foreground/65">
                    Enter your number to stay updated.
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
                        onChange={(event) => setPhone(event.target.value)}
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
                    <p className="mt-2 text-xs font-medium text-lime">
                      {phoneError}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-7 flex animate-in flex-col items-center text-center fade-in slide-in-from-right-4">
            <div className="mb-4 flex flex-col items-center gap-4 text-center">
              <span className="flex size-16 items-center justify-center rounded-3xl bg-lime text-lime-foreground shadow-lg">
                <Clock size={28} strokeWidth={2.4} />
              </span>

              <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight">
                <span className="block">Set Your</span>
                <span className="block">Weekly Rhythm</span>
              </h1>
            </div>

            <p className="mt-2 max-w-[17rem] text-base font-medium text-primary-foreground/80">
              Pick the days you usually train so friends know when to come thru.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {WEEKDAYS.map((day) => {
                const selected = days.includes(day)

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors',
                      selected
                        ? 'bg-lime text-lime-foreground'
                        : 'bg-white/10 text-primary-foreground',
                    )}
                  >
                    {selected ? <Check size={15} strokeWidth={3} /> : null}
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-7 pb-[calc(env(safe-area-inset-bottom)+28px)]">
        {step === 0 ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={authLoading}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white py-3.5 text-base font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {authLoading ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <Apple size={20} className="-mt-0.5" fill="currentColor" />
              )}
              Continue with Apple
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white py-3.5 text-base font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {authLoading ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <GoogleGlyph />
              )}
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => {
                setShowEmailForm((current) => !current)
                setAuthError(null)
                setAuthMessage(null)
              }}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/25 py-3.5 text-base font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              <Mail size={19} />
              Continue with Email
            </button>

            {showEmailForm ? (
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-black/10 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup')
                      setAuthError(null)
                      setAuthMessage(null)
                    }}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm font-semibold',
                      authMode === 'signup'
                        ? 'bg-white text-black'
                        : 'text-white/70',
                    )}
                  >
                    Create account
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin')
                      setAuthError(null)
                      setAuthMessage(null)
                    }}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm font-semibold',
                      authMode === 'signin'
                        ? 'bg-white text-black'
                        : 'text-white/70',
                    )}
                  >
                    Sign in
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/20 bg-white/5 px-4 text-base text-white placeholder:text-white/45 outline-none focus:border-lime focus:ring-2 focus:ring-lime/40"
                  />

                  <input
                    type="password"
                    autoComplete={
                      authMode === 'signup'
                        ? 'new-password'
                        : 'current-password'
                    }
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleEmailAuth()
                      }
                    }}
                    className="h-12 w-full rounded-xl border border-white/20 bg-white/5 px-4 text-base text-white placeholder:text-white/45 outline-none focus:border-lime focus:ring-2 focus:ring-lime/40"
                  />

                  <button
                    type="button"
                    onClick={handleEmailAuth}
                    disabled={authLoading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-lime px-4 text-sm font-bold text-lime-foreground disabled:opacity-60"
                  >
                    {authLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : null}

                    {authMode === 'signup'
                      ? 'Create Account'
                      : 'Sign In'}
                  </button>
                </div>
              </div>
            ) : null}

            {authError ? (
              <p className="rounded-xl bg-red-500/20 px-3 py-2 text-center text-sm font-medium text-white">
                {authError}
              </p>
            ) : null}

            {authMessage ? (
              <p className="rounded-xl bg-lime/20 px-3 py-2 text-center text-sm font-medium text-white">
                {authMessage}
              </p>
            ) : null}

            <p className="pt-1 text-center text-xs text-primary-foreground/70">
              WAITS coordinates workouts at gyms where you already have membership or guest access. WAITS does not sell gym memberships.
            </p>
            <p className="text-center text-xs text-primary-foreground/55">
              By continuing you agree to our Terms &amp; Privacy Policy.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleEnterWaits}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime py-4 text-base font-bold text-lime-foreground transition-transform active:scale-[0.98]"
          >
            Enter WAITS
            <ArrowRight size={20} strokeWidth={2.6} />
          </button>
        )}
      </div>
    </div>
  )
}

