import 'server-only'

import { stripe } from '@/lib/stripe'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

async function persistSubscription(subscription: any) {
  const userId = subscription.metadata?.user_id
  if (!userId) throw new Error('Stripe subscription is missing metadata.user_id')
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  const { error } = await createSupabaseAdmin().from('profiles').update({
    is_pro: ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status),
    stripe_customer_id: customerId ?? null,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
  }).eq('id', userId)
  if (error) throw error
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature') || ''

  const buf = await req.arrayBuffer()
  const rawBody = Buffer.from(buf)

  let event: any
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) return new Response('Webhook secret is not configured', { status: 500 })
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Basic event handling — extend as needed to persist subscription state.
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        {
          const session = event.data.object
          const userId = session.client_reference_id ?? session.metadata?.user_id
          if (!userId) throw new Error('Checkout session is missing its user reference')
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
          const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
          const { error } = await createSupabaseAdmin().from('profiles').update({
            is_pro: session.payment_status === 'paid',
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId ?? null,
            subscription_status: session.payment_status === 'paid' ? 'active' : 'incomplete',
          }).eq('id', userId)
          if (error) throw error
        }
        break
      case 'invoice.payment_succeeded':
        console.log('invoice.payment_succeeded', event.data.object)
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await persistSubscription(event.data.object)
        break
      default:
        console.log('Unhandled Stripe event type:', event.type)
    }
  } catch (err) {
    console.error('Error handling Stripe event:', err)
    return new Response('Webhook handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
