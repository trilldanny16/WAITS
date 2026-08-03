'use client'

import { useCallback, useMemo, useRef } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { startPremiumCheckout, confirmPremiumCheckout } from '@/app/actions/stripe'
import { PRO_PLAN } from '@/lib/products'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : Promise.resolve(null)

export function PremiumCheckout({ onSuccess }: { onSuccess: () => void }) {
  const sessionIdRef = useRef<string | null>(null)
  const publishableKeyMissing = !stripePublishableKey

  const fetchClientSecret = useCallback(async () => {
    const { clientSecret, sessionId } = await startPremiumCheckout(PRO_PLAN.id)
    sessionIdRef.current = sessionId
    return clientSecret as string
  }, [])

  const handleComplete = useCallback(async () => {
    const paid = await confirmPremiumCheckout(sessionIdRef.current ?? '')
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
