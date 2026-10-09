import { adapty, type AdaptyPaywallProduct, type AdaptyProfile } from 'react-native-adapty'

let activation: Promise<void> | null = null
let identityQueue: Promise<unknown> = Promise.resolve()
let requestedUserId: string | null = null
let identifiedUserId: string | null = null

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = identityQueue.then(operation, operation)
  identityQueue = next.catch(() => undefined)
  return next
}

export function activateAdapty() {
  if (activation) return activation
  const publicKey = process.env.EXPO_PUBLIC_ADAPTY_SDK_KEY
  if (!publicKey) {
    console.warn('Adapty mobile public SDK key is not configured yet.')
    activation = Promise.resolve()
    return activation
  }

  activation = adapty.activate(publicKey, {
    ios: { idfaCollectionDisabled: true },
    android: { adIdCollectionDisabled: true },
    __ignoreActivationOnFastRefresh: __DEV__,
  }).catch((error: unknown) => {
    activation = null // A transient activation error must be retryable.
    throw error
  })
  return activation
}

export function identifyAdaptyUser(userId: string | null) {
  requestedUserId = userId
  return serialize(async () => {
    await activateAdapty()
    if (!process.env.EXPO_PUBLIC_ADAPTY_SDK_KEY) return
    if (identifiedUserId === userId && userId !== null) return
    // The SDK may persist an identified customer across application restarts.
    // Inspect its actual identity instead of assuming our in-memory state is
    // authoritative. logout on an anonymous profile throws SDK error 3020.
    // Fail closed on profile/logout errors; never identify over an uncleared
    // previous customer or swallow an unrelated SDK error.
    identifiedUserId = null
    const sdkProfile = await adapty.getProfile()
    if (sdkProfile.customerUserId) await adapty.logout()
    if (userId && requestedUserId === userId) {
      await adapty.identify(userId)
      if (requestedUserId === userId) identifiedUserId = userId
    }
  })
}

function withBillingUser<T>(userId: string, operation: () => Promise<T>) {
  return serialize(async () => {
    requireAdaptyConfiguration()
    await activateAdapty()
    if (!userId || requestedUserId !== userId || identifiedUserId !== userId) {
      throw new Error('Your purchase account is not ready. Sign in again and retry.')
    }
    const result = await operation()
    if (requestedUserId !== userId) throw new Error('Your account changed. Please retry while signed in.')
    return result
  })
}

export const ADAPTY_ACCESS_LEVEL_ID =
  process.env.EXPO_PUBLIC_ADAPTY_ACCESS_LEVEL_ID ?? 'premium'

const ADAPTY_PLACEMENT_ID =
  process.env.EXPO_PUBLIC_ADAPTY_PLACEMENT_ID ?? 'main_paywall'

function requireAdaptyConfiguration() {
  if (!process.env.EXPO_PUBLIC_ADAPTY_SDK_KEY) {
    throw new Error('Purchases are not configured for this build yet.')
  }
}

export function hasProAccess(profile: AdaptyProfile) {
  return profile.accessLevels?.[ADAPTY_ACCESS_LEVEL_ID]?.isActive === true
}

export async function loadAdaptyProducts(userId: string) {
  return withBillingUser(userId, async () => {
    // Never log a profile, flow payload, receipt, SDK key or account identifier.
    // These bounded phase/count records distinguish placement resolution from
    // StoreKit retrieval without exposing personalized offers or customer data.
    let phase: 'getFlow' | 'getPaywallProducts' = 'getFlow'
    try {
      const flow = await adapty.getFlow(ADAPTY_PLACEMENT_ID)
      const paywalls = flow.paywalls ?? []
      const configuredProductCount = paywalls.reduce((count, paywall) => count + (paywall.productIdentifiers?.length ?? 0), 0)
      console.info('[WAITS billing retrieval]', { phase, status: 'success', paywallCount: paywalls.length, configuredProductCount })
      phase = 'getPaywallProducts'
      const products = await adapty.getPaywallProducts(flow)
      console.info('[WAITS billing retrieval]', { phase, status: 'success', productCount: products.length })
      return products
    } catch (error: unknown) {
      const code = error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined
      console.warn('[WAITS billing retrieval]', { phase, status: 'failure', code: typeof code === 'number' && Number.isFinite(code) ? code : null })
      throw error // Preserve SDK error identity; diagnostics do not change retries.
    }
  })
}

export async function purchaseAdaptyProduct(product: AdaptyPaywallProduct, userId: string) {
  return withBillingUser(userId, () => adapty.makePurchase(product))
}

export async function restoreAdaptyPurchases(userId: string) {
  return withBillingUser(userId, () => adapty.restorePurchases())
}
