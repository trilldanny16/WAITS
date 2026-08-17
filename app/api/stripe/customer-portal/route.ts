import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { authenticatedUserFromRequest, createSupabaseAdmin } from '@/lib/supabase-admin'
import { assertSameOriginMutation, requestValidationResponse } from '@/lib/request-security'


export async function POST(request: Request) {
  try {
    assertSameOriginMutation(request)
    const user = await authenticatedUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error } = await createSupabaseAdmin()
      .from('profiles')
      .select('is_pro, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (error || !profile?.is_pro) {
      return NextResponse.json({ error: 'An active WAITS Pro membership was not found.' }, { status: 403 })
    }
    if (!profile.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer is linked to this profile.' }, { status: 400 })
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: new URL(request.url).origin,
    })
    return NextResponse.json({ url: portal.url })
  } catch (error) {
    const validationResponse = requestValidationResponse(error)
    if (validationResponse) return validationResponse

    console.error('Stripe Customer Portal error:', error)
    return NextResponse.json({ error: 'Billing settings are temporarily unavailable.' }, { status: 500 })
  }
}
