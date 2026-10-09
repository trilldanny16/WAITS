import type { AdaptyPaywallProduct } from 'react-native-adapty'
export const PRO_PLANS = [
  { id: 'com.waitsapp.waits.pro.monthly', label: 'Monthly', period: 'month', intended: 9.99 },
  { id: 'com.waitsapp.waits.pro.annual', label: 'Annual', period: 'year', intended: 99.99 },
] as const
export function validPlanProduct(product: AdaptyPaywallProduct, index: number) {
  const plan = PRO_PLANS[index]
  return product.vendorProductId === plan.id && product.subscription?.subscriptionPeriod.unit === plan.period
    && product.subscription.subscriptionPeriod.numberOfUnits === 1 && Boolean(product.price?.localizedString)
    && Number.isFinite(product.price?.amount) && (product.price?.amount ?? 0) > 0
}
export function annualSavings(monthly?: AdaptyPaywallProduct, annual?: AdaptyPaywallProduct) {
  if (!monthly?.price || !annual?.price || !monthly.price.currencyCode || monthly.price.currencyCode !== annual.price.currencyCode) return null
  const fullYear = monthly.price.amount * 12
  return fullYear > annual.price.amount && fullYear > 0 ? Math.round((1 - annual.price.amount / fullYear) * 1000) / 10 : null
}
export function priceMismatch(product: AdaptyPaywallProduct, index: number) {
  return product.regionCode === 'US' && product.price?.currencyCode === 'USD' && Math.abs(product.price.amount - PRO_PLANS[index].intended) > 0.001
}
