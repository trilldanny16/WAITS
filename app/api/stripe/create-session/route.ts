import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { PRO_PLAN } from '@/lib/products'
import { authenticatedUserFromRequest, createSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const user = await authenticatedUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const planId = body.planId as string | undefined

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 })
    }

    if (planId !== PRO_PLAN.id) {
      return NextResponse.json({ error: 'Unsupported plan' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await createSupabaseAdmin()
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()
    if (profileError) throw profileError

    const checkoutParams = {
      ui_mode: 'embedded_page' as const,
      redirect_on_completion: 'never' as const,
      mode: 'subscription' as const,
      managed_payments: { enabled: false },
      billing_address_collection: 'required' as const,
      line_items: [
        {
          price_data: {
            currency: 'usd' as const,
            recurring: { interval: PRO_PLAN.interval },
            product_data: {
              name: PRO_PLAN.name,
              description: PRO_PLAN.description,
              tax_code: 'txcd_10000000',
            },
            unit_amount: PRO_PLAN.priceInCents,
          },
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }),
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
    }

    const session = await stripe.checkout.sessions.create(checkoutParams)

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('Stripe create-session error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not create Stripe checkout session',
      },
      { status: 500 },
    )
  }
}
