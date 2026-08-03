'use server'

import { stripe } from '@/lib/stripe'
import { PLANS } from '@/lib/products'

/**
 * Creates an embedded subscription Checkout session for the given plan.
 * The price is looked up server-side from the PLANS catalog so the client
 * can never specify or tamper with the amount charged.
 */
export async function startPremiumCheckout(planId: string) {
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) {
    throw new Error(`Plan with id "${planId}" not found`)
  }

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      redirect_on_completion: 'never',
      mode: 'subscription',
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: { interval: plan.interval },
            product_data: {
              name: plan.name,
              description: plan.description,
            },
            unit_amount: plan.priceInCents,
          },
          quantity: 1,
        },
      ],
    })

    return { clientSecret: session.client_secret, sessionId: session.id }
  } catch (error) {
    console.error('Stripe checkout session create failed', error)
    throw new Error('Stripe checkout session could not be created. Check your Stripe API keys and plan configuration.')
  }
}

/**
 * Server-side confirmation that a checkout session was actually paid.
 * We never trust the client to self-report premium status — we retrieve
 * the session from Stripe and verify it truly completed.
 */
export async function confirmPremiumCheckout(sessionId: string): Promise<boolean> {
  if (!sessionId) return false
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return session.status === 'complete' && session.payment_status === 'paid'
  } catch {
    return false
  }
}
