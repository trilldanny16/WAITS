import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { AdaptyPaywallProduct } from 'react-native-adapty'
import { ADAPTY_ACCESS_LEVEL_ID, hasProAccess, identifyAdaptyUser, loadAdaptyProducts, purchaseAdaptyProduct, restoreAdaptyPurchases } from '@/lib/adapty'
import { annualSavings, priceMismatch, PRO_PLANS, validPlanProduct } from '@/lib/subscription-plans'
import { useAuth } from '@/providers/AuthProvider'

type Props = { visible: boolean; onClose: () => void; onEntitlementChanged: () => void }
const LEGAL_BASE = 'https://come-thru-gym-bud.vercel.app'
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Purchases could not load. Please try again.' }

export function AdaptyPaywallModal({ visible, onClose, onEntitlementChanged }: Props) {
  const { user, refreshProfile } = useAuth()
  const insets = useSafeAreaInsets()
  const userId = user?.id ?? ''
  const current = useRef({ visible, userId })
  current.current = { visible, userId }
  const generation = useRef(0)
  const operationBusy = useRef(false)
  const reloadAfterBusy = useRef(false)
  const latestLoad = useRef<() => Promise<void>>(async () => undefined)
  const [products, setProducts] = useState<AdaptyPaywallProduct[]>([])
  const [productsUserId, setProductsUserId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>(PRO_PLANS[1].id)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const validCurrent = (id: string) => current.current.visible && current.current.userId === id

  const load = useCallback(async () => {
    const request = ++generation.current
    // Product payloads can contain personalized offers. Never reuse them after
    // an account switch, even while an earlier StoreKit operation is finishing.
    setProducts([]); setProductsUserId(null)
    if (operationBusy.current) {
      reloadAfterBusy.current = true
      setLoading(false)
      return
    }
    setLoading(true); setError(null); setProducts([]); setNotice(null)
    try {
      if (!userId) throw new Error('Sign in to your WAITS account before purchasing.')
      await identifyAdaptyUser(userId)
      const available = await loadAdaptyProducts(userId)
      if (generation.current !== request || !current.current.visible || current.current.userId !== userId) return
      const mapped = PRO_PLANS.flatMap((plan, index) => {
        const product = available.find((item) => item.vendorProductId === plan.id)
        return product && validPlanProduct(product, index) && product.accessLevelId === ADAPTY_ACCESS_LEVEL_ID ? [product] : []
      })
      setProducts(mapped)
      setProductsUserId(userId)
      setSelectedId(mapped.find((item) => item.vendorProductId === PRO_PLANS[1].id)?.vendorProductId ?? mapped[0]?.vendorProductId ?? PRO_PLANS[1].id)
      if (mapped.length !== 2) setError('Some subscription plans are unavailable from the App Store. Please retry. You cannot purchase an unavailable plan.')
    } catch (caught) {
      if (generation.current === request && current.current.visible && current.current.userId === userId) setError(errorMessage(caught))
    } finally { if (generation.current === request) setLoading(false) }
  }, [userId])
  latestLoad.current = load
  useEffect(() => { if (visible) void load(); return () => { generation.current += 1 } }, [load, visible])

  const notifySync = async (id: string) => {
    // Only verified webhooks may grant backend Pro; never set is_pro here.
    if (!validCurrent(id)) return
    await refreshProfile().catch(() => console.warn('Purchase confirmed; server entitlement refresh will retry when WAITS returns to the foreground.'))
    if (validCurrent(id)) onEntitlementChanged()
  }
  const purchase = async () => {
    const selected = productsUserId === userId ? products.find((product) => product.vendorProductId === selectedId) : undefined
    if (!selected || operationBusy.current || loading || !userId) return
    const account = userId
    operationBusy.current = true; setBusy(true); setError(null); setNotice(null)
    try {
      const result = await purchaseAdaptyProduct(selected, account)
      if (!validCurrent(account)) return
      if (result.type === 'success') {
        await notifySync(account)
        if (!validCurrent(account)) return
        setNotice(hasProAccess(result.profile) ? 'Purchase confirmed by the App Store. Pro access is syncing securely to your WAITS account.' : 'Purchase received, but Pro access is not active yet. Contact support if this persists.')
      } else if (result.type === 'pending') setNotice('Purchase pending. Access unlocks after App Store approval and verification.')
      else setNotice('Purchase canceled. No changes were made to your WAITS membership.')
    } catch (caught) { if (validCurrent(account)) setError(errorMessage(caught)) }
    finally {
      operationBusy.current = false; setBusy(false)
      if (reloadAfterBusy.current) {
        reloadAfterBusy.current = false
        if (current.current.visible) void latestLoad.current()
      }
    }
  }
  const restore = async () => {
    if (operationBusy.current || !userId) return
    const account = userId
    operationBusy.current = true; setBusy(true); setError(null); setNotice(null)
    try {
      await identifyAdaptyUser(account)
      const restored = await restoreAdaptyPurchases(account)
      if (!validCurrent(account)) return
      await notifySync(account)
      if (validCurrent(account)) setNotice(hasProAccess(restored) ? 'Active purchase restored. Pro access is syncing securely to your WAITS account.' : 'No active WAITS Pro purchase was found for this Apple ID.')
    } catch (caught) { if (validCurrent(account)) setError(errorMessage(caught)) }
    finally {
      operationBusy.current = false; setBusy(false)
      if (reloadAfterBusy.current) {
        reloadAfterBusy.current = false
        if (current.current.visible) void latestLoad.current()
      }
    }
  }
  const currentProducts = productsUserId === userId ? products : []
  const monthly = currentProducts.find((item) => item.vendorProductId === PRO_PLANS[0].id)
  const annual = currentProducts.find((item) => item.vendorProductId === PRO_PLANS[1].id)
  const savings = annualSavings(monthly, annual)
  const selected = currentProducts.find((item) => item.vendorProductId === selectedId)
  const openLegal = (path: string) => void Linking.openURL(`${LEGAL_BASE}/${path}`).catch(() => Alert.alert('Could not open link', 'Please try again.'))

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!busy) onClose() }}>
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close WAITS Pro" disabled={busy} onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
        <Text style={styles.headerTitle}>WAITS PRO</Text><View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
        <Image source={require('../../assets/waits-app-icon.png')} style={styles.logo} accessibilityLabel="WAITS logo" />
        <Text style={styles.title}>Your training. Upgraded.</Text>
        <Text style={styles.subtitle}>Personal DMs · Photo galleries{'\n'}Larger workout groups · Reliability & stats</Text>
        <Text style={styles.freeNote}>Workout group chats remain included with Free.</Text>
        {loading ? <ActivityIndicator color="#ADFF18" style={styles.loading} /> : null}
        {PRO_PLANS.map((plan, index) => {
          const product = currentProducts.find((item) => item.vendorProductId === plan.id)
          const available = Boolean(product)
          const checked = selectedId === plan.id && available
          return <Pressable key={plan.id} accessibilityRole="radio" accessibilityState={{ checked, disabled: !available || busy || loading }} disabled={!available || busy || loading} onPress={() => setSelectedId(plan.id)} style={[styles.plan, checked && styles.selected, !available && styles.unavailable]}>
            <View style={styles.planTop}><Text style={styles.planName}>{plan.label}</Text>{index === 1 ? <Text style={styles.badge}>BEST VALUE</Text> : null}<View style={[styles.radio, checked && styles.radioSelected]} /></View>
            <Text style={styles.price}>{product?.price?.localizedString ?? `$${plan.intended.toFixed(2)}`}<Text style={styles.period}> /{plan.period}</Text></Text>
            <Text style={styles.planDetail}>{product ? (index === 1 && savings !== null ? `Save ${savings.toFixed(1)}% vs. 12 monthly payments` : index === 0 ? 'Billed monthly · Auto-renewing' : 'Billed annually · Auto-renewing') : loading ? 'Loading App Store price…' : 'Intended US price · Currently unavailable'}</Text>
            {index === 1 && product && savings !== null ? <Text style={styles.planDetail}>Billed annually · Auto-renewing</Text> : null}
            {product && priceMismatch(product, index) ? <Text style={styles.warning}>App Store price differs from the intended US price. The amount above is the actual store price.</Text> : null}
          </Pressable>
        })}
        {error ? <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable disabled={busy || loading} accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>Try Again</Text></Pressable></View> : null}
        {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={selected ? `Subscribe to ${selectedId === PRO_PLANS[1].id ? 'Annual' : 'Monthly'}, ${selected.price?.localizedString}` : 'Subscription unavailable'} disabled={!selected || busy || loading} onPress={() => void purchase()} style={[styles.subscribe, (!selected || busy || loading) && styles.disabled]}>{busy ? <ActivityIndicator color="#000" /> : <Text style={styles.subscribeText}>{selected ? `Subscribe · ${selected.price?.localizedString}/${selectedId === PRO_PLANS[1].id ? 'year' : 'month'}` : 'Subscriptions Unavailable'}</Text>}</Pressable>
        <Pressable accessibilityRole="button" disabled={busy || loading || !userId} onPress={() => void restore()} style={styles.restore}><Text style={styles.restoreText}>Restore Purchases</Text></Pressable>
        <Text style={styles.legal}>Payment is charged to your Apple ID after confirmation. Subscriptions renew automatically unless canceled at least 24 hours before the current period ends. Manage or cancel in App Store subscription settings.</Text>
        <View style={styles.links}><Pressable accessibilityRole="link" onPress={() => openLegal('terms')}><Text style={styles.link}>Terms of Service</Text></Pressable><Pressable accessibilityRole="link" onPress={() => openLegal('privacy')}><Text style={styles.link}>Privacy Policy</Text></Pressable></View>
      </ScrollView>
    </View>
  </Modal>
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 }, close: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#171717', alignItems: 'center', justifyContent: 'center' }, closeText: { color: '#fff', fontSize: 30 }, spacer: { width: 44 }, headerTitle: { color: '#0088FF', fontSize: 18, fontWeight: '900', letterSpacing: 1 }, content: { paddingHorizontal: 20 }, logo: { width: 76, height: 76, alignSelf: 'center', borderRadius: 18 }, title: { fontSize: 27, fontWeight: '900', color: '#fff', textAlign: 'center', marginTop: 14 }, subtitle: { fontSize: 15, lineHeight: 23, color: '#C0C2CA', textAlign: 'center', marginTop: 10 }, freeNote: { color: '#989BA6', fontSize: 12, textAlign: 'center', marginTop: 10, marginBottom: 12 }, loading: { marginVertical: 10 }, plan: { marginTop: 12, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#34363E', backgroundColor: '#111318' }, selected: { borderColor: '#0088FF', borderWidth: 2 }, unavailable: { opacity: 0.68 }, planTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, planName: { color: '#fff', fontWeight: '800', fontSize: 17, flex: 1 }, badge: { color: '#ADFF18', fontWeight: '900', fontSize: 10 }, radio: { height: 22, width: 22, borderRadius: 11, borderWidth: 2, borderColor: '#737782' }, radioSelected: { borderColor: '#0088FF', backgroundColor: '#0088FF' }, price: { color: '#fff', fontWeight: '900', fontSize: 26, marginTop: 9 }, period: { color: '#989BA6', fontSize: 15, fontWeight: '500' }, planDetail: { color: '#B7BAC4', fontSize: 12, marginTop: 5 }, warning: { color: '#FFBF69', fontSize: 12, lineHeight: 18, marginTop: 6 }, errorBox: { padding: 16, marginTop: 16, borderRadius: 16, backgroundColor: '#291114' }, errorText: { color: '#FF929A', fontSize: 13, lineHeight: 19 }, retry: { color: '#fff', fontWeight: '800', marginTop: 10, paddingVertical: 8 }, notice: { color: '#B7D9FF', marginTop: 15, fontSize: 13, lineHeight: 20 }, subscribe: { minHeight: 54, borderRadius: 27, backgroundColor: '#ADFF18', alignItems: 'center', justifyContent: 'center', marginTop: 20, padding: 14 }, subscribeText: { color: '#000', fontWeight: '900', fontSize: 16, textAlign: 'center' }, disabled: { opacity: 0.45 }, restore: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 5 }, restoreText: { color: '#0088FF', fontWeight: '800', fontSize: 14 }, legal: { color: '#A1A4AE', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 8 }, links: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 }, link: { color: '#0088FF', fontSize: 12, minHeight: 44, paddingTop: 12 },
})
