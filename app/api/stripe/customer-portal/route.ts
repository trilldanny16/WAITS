import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { authenticatedUserFromRequest, createSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const user = await authenticatedUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await createSupabaseAdmin().from('profiles').select('stripe_customer_id').eq('id', user.id).single()
  if (error || !data?.stripe_customer_id) return NextResponse.json({ error: 'No Stripe customer is linked.' }, { status: 400 })
  const session = await stripe.billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: new URL(request.url).origin })
  return NextResponse.json({ url: session.url })
}

