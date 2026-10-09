'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Apple,
  Mail,
  Check,
  Clock,
  Dumbbell,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

import { supabase } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type AuthMode = 'signup' | 'signin'

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
  }
}

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

export function SignInBrand() {
  return <div className="flex flex-col items-center text-center">
    <Image src="/waits-clock-logo.svg" alt="WAITS clock and weights logo" width={192} height={122} priority className="pointer-events-none h-[122px] w-48 object-contain" />
    <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.06em]">WAITS</h1>
    <p className="mt-2 text-2xl font-extrabold">Never lift alone.</p>
    <p className="mt-1 text-base text-white/90">Find your people. Train together.</p>
  </div>
}

export function SignInLegal() {
  return <div className="pt-2 text-center text-xs leading-relaxed text-white/90">
    <p>Train at gyms where you already have membership or guest access. WAITS does not sell gym memberships.</p>
    <p className="mt-3">By continuing, you agree to our</p>
    <div className="flex flex-wrap items-center justify-center gap-2">
      <a href="/terms" className="inline-flex min-h-11 items-center px-1 font-semibold text-white underline underline-offset-2">Terms of Service</a><span aria-hidden="true">·</span><a href="/privacy" className="inline-flex min-h-11 items-center px-1 font-semibold text-white underline underline-offset-2">Privacy Policy</a>
    </div>
  </div>
}

export function SignInOptions({ busy = false, onApple, onGoogle, onEmail }: { busy?: boolean; onApple: () => void; onGoogle: () => void; onEmail: () => void }) {
  const buttonStyle = 'flex min-h-[62px] w-full items-center justify-center gap-2.5 rounded-2xl py-3.5 text-lg font-semibold transition-transform active:scale-[0.98] disabled:opacity-60'
  return <div className="space-y-3">
    <button type="button" onClick={onApple} disabled={busy} className={cn(buttonStyle, 'bg-white text-black')}>{busy ? <Loader2 size={19} className="animate-spin" /> : <Apple size={20} fill="currentColor" />}Sign in with Apple</button>
    <button type="button" onClick={onGoogle} disabled={busy} className={cn(buttonStyle, 'bg-white text-black ring-1 ring-white/25')}>{busy ? <Loader2 size={19} className="animate-spin" /> : <GoogleGlyph />}Sign in with Google</button>
    <button type="button" onClick={onEmail} disabled={busy} className={cn(buttonStyle, 'border border-white/50 text-white')}><Mail size={19} />Continue with Email</button>
  </div>
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<0 | 1>(0)
  const [days, setDays] = useState<string[]>(['Mon', 'Wed', 'Fri'])

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

  useEffect(() => {
    const receiveNativeAuth = async (event: MessageEvent) => {
      if (typeof event.data !== 'string') return

      try {
        const message = JSON.parse(event.data) as {
          type?: string
          accessToken?: string
          refreshToken?: string
          error?: string
        }

        if (message.type === 'WAITS_APPLE_SIGN_IN_CANCELLED') {
          setAuthLoading(false)
          return
        }

        if (message.type === 'WAITS_APPLE_SIGN_IN_ERROR') {
          setAuthError(message.error || 'Apple sign in could not be completed. Please try again.')
          setAuthLoading(false)
          return
        }

        if (
          message.type === 'WAITS_APPLE_SESSION' &&
          message.accessToken &&
          message.refreshToken
        ) {
          const { error } = await supabase.auth.setSession({
            access_token: message.accessToken,
            refresh_token: message.refreshToken,
          })

          if (error) {
            setAuthError(error.message)
            setAuthLoading(false)
          }
        }
      } catch {
        // Ignore unrelated messages from the embedded browser.
      }
    }

    window.addEventListener('message', receiveNativeAuth)
    return () => window.removeEventListener('message', receiveNativeAuth)
  }, [])

  const toggleDay = (day: string) => {
    setDays((previousDays) =>
      previousDays.includes(day)
        ? previousDays.filter((existingDay) => existingDay !== day)
        : [...previousDays, day],
    )
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

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'WAITS_NATIVE_APPLE_SIGN_IN' }),
      )
      return
    }

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

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setAuthError('Your login session could not be verified. Please sign in again.')
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
        console.error('Unable to complete onboarding', error)
        setAuthError("We couldn't save your weekly rhythm. Please try again.")
        return
      }

      onDone()
    } catch (error) {
      console.error('Unable to complete onboarding', error)
      setAuthError("We couldn't save your weekly rhythm. Please try again.")
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-[#000000] text-white">
      {step === 1 ? (
        <div className="relative z-30 flex shrink-0 items-center px-7 pt-[calc(env(safe-area-inset-top)+16px)]">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="relative z-30 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white transition-colors hover:bg-white/15"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-[440px] shrink-0 flex-1 flex-col justify-center px-6 pt-[calc(env(safe-area-inset-top)+24px)]">
        {step === 0 ? (
          <div className="my-5 animate-in fade-in slide-in-from-bottom-4"><SignInBrand /></div>
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

      <div className="mx-auto w-full max-w-[440px] shrink-0 px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5">
        {step === 0 ? (
          <div className="space-y-3">
            <SignInOptions busy={authLoading} onApple={() => void handleAppleSignIn()} onGoogle={() => void handleGoogleSignIn()} onEmail={() => {
                setShowEmailForm((current) => !current)
                setAuthError(null)
                setAuthMessage(null)
              }} />

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
                        ? 'bg-primary text-primary-foreground'
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
                        ? 'bg-primary text-primary-foreground'
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
                    className="h-12 w-full rounded-xl border border-white/20 bg-white/5 px-4 text-base text-white placeholder:text-muted-foreground outline-none focus:border-lime focus:ring-2 focus:ring-lime/40"
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
                    className="h-12 w-full rounded-xl border border-white/20 bg-white/5 px-4 text-base text-white placeholder:text-muted-foreground outline-none focus:border-lime focus:ring-2 focus:ring-lime/40"
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

            <SignInLegal />
          </div>
        ) : (
          <div className="space-y-3">
            {authError ? (
              <p
                role="alert"
                className="rounded-xl bg-red-500/20 px-3 py-2 text-center text-sm font-medium text-white"
              >
                {authError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleEnterWaits}
              disabled={authLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime py-4 text-base font-bold text-lime-foreground transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {authLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <ArrowRight size={20} strokeWidth={2.6} />
              )}
              {authLoading ? 'Saving...' : 'Enter WAITS'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

