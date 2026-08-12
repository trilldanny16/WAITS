import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { authenticatedUserFromRequest, createSupabaseAdmin } from '@/lib/supabase-admin'

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
    const paid = session.status === 'complete' && session.payment_status === 'paid' && session.client_reference_id === user.id

    if (paid) {
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      const { error } = await createSupabaseAdmin().from('profiles').update({
        is_pro: true,
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscriptionId ?? null,
        subscription_status: 'active',
      }).eq('id', user.id)
      if (error) throw error
    }

    return NextResponse.json({ paid })
  } catch (error) {
    console.error('Stripe confirm-session error:', error)
    return NextResponse.json({ error: 'Could not confirm Stripe checkout session' }, { status: 500 })
  }
}
