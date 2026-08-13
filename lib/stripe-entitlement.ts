import 'server-only'

import { stripe } from '@/lib/stripe'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

const PRO_STATUSES = new Set(['active', 'trialing'])

export async function syncStripeSubscription(
  subscriptionId: string,
  expectedUserId?: string,
) {
  const observedAt = Date.now()
  const triggeringSubscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = triggeringSubscription.metadata?.user_id

  if (!userId) throw new Error('Stripe subscription is missing metadata.user_id')
  if (expectedUserId && userId !== expectedUserId) {
    throw new Error('Stripe subscription does not belong to the authenticated user')
  }

  const customerId =
    typeof triggeringSubscription.customer === 'string'
      ? triggeringSubscription.customer
      : triggeringSubscription.customer.id

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  })
  const activeSubscription = subscriptions.data.find(
    (candidate) =>
      PRO_STATUSES.has(candidate.status)
      && candidate.metadata?.user_id === userId,
  )
  const authoritativeSubscription = activeSubscription ?? triggeringSubscription
  if (authoritativeSubscription.metadata?.user_id !== userId) {
    throw new Error('Stripe customer subscriptions have conflicting user bindings')
  }

  const isPro = PRO_STATUSES.has(authoritativeSubscription.status)
  const { data, error } = await createSupabaseAdmin().rpc('apply_stripe_entitlement', {
    target_user_id: userId,
    target_customer_id: customerId,
    target_subscription_id: authoritativeSubscription.id,
    target_subscription_status: authoritativeSubscription.status,
    target_is_pro: isPro,
    observed_at_ms: observedAt,
  })

  if (error) throw error
  return {
    applied: data === true,
    userId,
    customerId,
    subscriptionId: authoritativeSubscription.id,
    status: authoritativeSubscription.status,
    isPro,
  }
}
