import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { authenticatedUserFromRequest } from '@/lib/supabase-admin'
import { persistProEntitlement } from '@/lib/pro-entitlement'

export async function POST(request: Request) {
  try {
    const user = await authenticatedUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const sessionId = body.sessionId as string | undefined
    if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
    const boundUserId = session.client_reference_id ?? session.metadata?.user_id
    if (boundUserId !== user.id) {
      return NextResponse.json({ error: 'Checkout session belongs to another user' }, { status: 403 })
    }
    if (session.status !== 'complete' || !session.subscription || typeof session.subscription === 'string') {
      return NextResponse.json({ paid: false, status: session.status })
    }

    const entitlement = await persistProEntitlement({
      userId: user.id,
      subscription: session.subscription,
      source: 'checkout-return',
    })
    return NextResponse.json({ paid: entitlement.isPro, ...entitlement })
  } catch (error) {
    console.error('Stripe confirm-session error:', error)
    return NextResponse.json({ error: 'Could not confirm Stripe checkout session' }, { status: 500 })
  }
}
