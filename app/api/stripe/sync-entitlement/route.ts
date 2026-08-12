import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { authenticatedUserFromRequest } from '@/lib/supabase-admin'
import { persistProEntitlement } from '@/lib/pro-entitlement'

export async function POST(request: Request) {
  try {
    const user = await authenticatedUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const subscriptions = await stripe.subscriptions.search({
      query: `metadata['user_id']:'${user.id}'`,
      limit: 20,
    })
    const subscription = subscriptions.data
      .sort((a, b) => b.created - a.created)
      .find((candidate) => candidate.status === 'active' || candidate.status === 'trialing')

    if (!subscription) return NextResponse.json({ isPro: false, status: 'not_found' })

    const entitlement = await persistProEntitlement({
      userId: user.id,
      subscription,
      source: 'authenticated-reconciliation',
    })
    return NextResponse.json(entitlement)
  } catch (error) {
    console.error('Stripe entitlement reconciliation failed', { error })
    return NextResponse.json({ error: 'Could not synchronize subscription status' }, { status: 500 })
  }
}
