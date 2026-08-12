import 'server-only'

import { stripe } from '@/lib/stripe'
import { persistProEntitlement } from '@/lib/pro-entitlement'

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature') || ''
  const rawBody = Buffer.from(await req.arrayBuffer())

  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) return new Response('Webhook secret is not configured', { status: 500 })
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.client_reference_id ?? session.metadata?.user_id
        if (!userId) throw new Error('Checkout session is missing its user reference')
        if (!session.subscription) throw new Error('Checkout session is missing its subscription')
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
        )
        await persistProEntitlement({ userId, subscription, source: event.type })
        break
      }
      case 'invoice.payment_succeeded': {
        const subscriptionRef = event.data.object.parent?.subscription_details?.subscription
        if (subscriptionRef) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef.id,
          )
          const userId = subscription.metadata.user_id
          if (!userId) throw new Error('Stripe subscription is missing metadata.user_id')
          await persistProEntitlement({ userId, subscription, source: event.type })
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const userId = subscription.metadata.user_id
        if (!userId) throw new Error('Stripe subscription is missing metadata.user_id')
        await persistProEntitlement({ userId, subscription, source: event.type })
        break
      }
      default:
        break
    }
  } catch (error) {
    console.error('Stripe webhook event failed', { eventId: event.id, eventType: event.type, error })
    return new Response('Webhook handler error', { status: 500 })
  }

  return Response.json({ received: true })
}
