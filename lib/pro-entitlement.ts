import 'server-only'

import type Stripe from 'stripe'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>(['active', 'trialing'])

export async function persistProEntitlement({ userId, subscription, source }: {
  userId: string
  subscription: Stripe.Subscription
  source: string
}) {
  if (!subscription.metadata.user_id || subscription.metadata.user_id !== userId) {
    throw new Error(`Stripe subscription user mismatch (${source})`)
  }

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id
  const isPro = ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)
  const { data, error } = await createSupabaseAdmin()
    .from('profiles')
    .update({
      is_pro: isPro,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
    })
    .eq('id', userId)
    .select('id, is_pro, subscription_status')
    .single()

  if (error || !data) {
    console.error('Pro entitlement profile update failed', {
      source, userId, subscriptionId: subscription.id, status: subscription.status,
      error: error?.message ?? 'No profile row was updated',
    })
    throw error ?? new Error('No profile row was updated')
  }

  console.info('Pro entitlement synchronized', {
    source, userId: data.id, subscriptionId: subscription.id,
    status: data.subscription_status, isPro: data.is_pro,
  })
  return { isPro: data.is_pro === true, status: data.subscription_status as string }
}
