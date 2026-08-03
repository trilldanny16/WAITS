import 'server-only'

import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature') || ''

  const buf = await req.arrayBuffer()
  const rawBody = Buffer.from(buf)

  let event: any
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } else {
      // Fallback for local/dev without a webhook secret: parse the body directly.
      event = JSON.parse(rawBody.toString('utf8'))
    }
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Basic event handling — extend as needed to persist subscription state.
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('checkout.session.completed', event.data.object)
        break
      case 'invoice.payment_succeeded':
        console.log('invoice.payment_succeeded', event.data.object)
        break
      case 'customer.subscription.updated':
        console.log('customer.subscription.updated', event.data.object)
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
