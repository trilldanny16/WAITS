'use client'

import { useCallback, useMemo, useRef } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { PRO_PLAN } from '@/lib/products'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : Promise.resolve(null)

export function PremiumCheckout({ onSuccess }: { onSuccess: () => void }) {
  const sessionIdRef = useRef<string | null>(null)
  const publishableKeyMissing = !stripePublishableKey

  const fetchClientSecret = useCallback(async () => {
    const response = await fetch('/api/stripe/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: PRO_PLAN.id }),
    })

    const data = await response.json()

    if (!response.ok || !data.clientSecret || !data.sessionId) {
      console.error('Stripe create session failed', data)
      throw new Error(data.error || 'Could not create Stripe checkout session')
    }

    sessionIdRef.current = data.sessionId
    return data.clientSecret as string
  }, [])

  const handleComplete = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return

    const response = await fetch('/api/stripe/confirm-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })

    const data = await response.json()
    const paid = response.ok && data.paid === true

    if (paid) onSuccess()
  }, [onSuccess])

  const providerOptions = useMemo(
    () => ({ fetchClientSecret, onComplete: handleComplete }),
    [fetchClientSecret, handleComplete],
  )

  return (
    <div id="premium-checkout" className="overflow-hidden rounded-2xl">
      {!publishableKeyMissing ? (
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={providerOptions}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      ) : (
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-red-600">
          Stripe is not configured. Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in your local environment.
        </div>
      )}
    </div>
  )
}
