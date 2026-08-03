'use client'

import { useCallback, useRef } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { startPremiumCheckout, confirmPremiumCheckout } from '@/app/actions/stripe'
import { PRO_PLAN } from '@/lib/products'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string,
)

export function PremiumCheckout({ onSuccess }: { onSuccess: () => void }) {
  const sessionIdRef = useRef<string | null>(null)

  const fetchClientSecret = useCallback(async () => {
    const { clientSecret, sessionId } = await startPremiumCheckout(PRO_PLAN.id)
    sessionIdRef.current = sessionId
    return clientSecret as string
  }, [])

  const handleComplete = useCallback(async () => {
    const paid = await confirmPremiumCheckout(sessionIdRef.current ?? '')
    if (paid) onSuccess()
  }, [onSuccess])

  return (
    <div id="premium-checkout" className="overflow-hidden rounded-2xl">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret, onComplete: handleComplete }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
