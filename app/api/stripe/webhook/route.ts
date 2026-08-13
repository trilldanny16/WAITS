import 'server-only'

import { stripe } from '@/lib/stripe'
import { syncStripeSubscription } from '@/lib/stripe-entitlement'

function subscriptionIdFrom(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) {
    return new Response('Webhook signature configuration is missing', { status: 500 })
  }

  const rawBody = Buffer.from(await request.arrayBuffer())
  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    let subscriptionId: string | null = null

    if (event.type === 'checkout.session.completed') {
      subscriptionId = subscriptionIdFrom(event.data.object.subscription)
    } else if (
      event.type === 'customer.subscription.created'
      || event.type === 'customer.subscription.updated'
      || event.type === 'customer.subscription.deleted'
    ) {
      subscriptionId = event.data.object.id
    }

    if (subscriptionId) {
      await syncStripeSubscription(subscriptionId)
    }
  } catch (error) {
    console.error(`Stripe webhook handling failed for ${event.type} (${event.id}):`, error)
    return new Response('Webhook handler error', { status: 500 })
  }

  return Response.json({ received: true })
}
