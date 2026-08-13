import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { authenticatedUserFromRequest } from '@/lib/supabase-admin'
import { syncStripeSubscription } from '@/lib/stripe-entitlement'

export async function POST(request: Request) {
  try {
    const user = await authenticatedUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const sessionId = body.sessionId as string | undefined
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (
      session.status !== 'complete'
      || session.client_reference_id !== user.id
      || session.metadata?.user_id !== user.id
    ) {
      return NextResponse.json({ paid: false })
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Checkout has no subscription' }, { status: 409 })
    }

    const entitlement = await syncStripeSubscription(subscriptionId, user.id)
    return NextResponse.json({
      paid: entitlement.isPro,
      status: entitlement.status,
    })
  } catch (error) {
    console.error('Stripe confirm-session error:', error)
    return NextResponse.json(
      { error: 'Could not confirm Stripe checkout session' },
      { status: 500 },
    )
  }
}
