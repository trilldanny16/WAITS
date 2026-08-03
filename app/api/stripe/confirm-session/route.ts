import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const sessionId = body.sessionId as string | undefined

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const paid = session.status === 'complete' && session.payment_status === 'paid'

    return NextResponse.json({ paid })
  } catch (error) {
    console.error('Stripe confirm-session error:', error)
    return NextResponse.json({ error: 'Could not confirm Stripe checkout session' }, { status: 500 })
  }
}
