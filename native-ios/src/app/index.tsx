import { useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { Redirect } from 'expo-router'
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview'
import { supabase } from '@/lib/supabase'
import { AdaptyPaywallModal } from '@/components/AdaptyPaywallModal'
import { ONBOARDING_SEEN_KEY } from '@/features/onboarding/draft'
import { useAuth } from '@/providers/AuthProvider'

const WAITS_ICON = require('../../assets/waits-app-icon.png')

const WAITS_APP_URL =
  process.env.EXPO_PUBLIC_WAITS_WEB_URL ??
  'https://come-thru-gym-bud.vercel.app/'

export default function WaitsApp() {
  const { session, loading: authLoading, signOut, refreshProfile } = useAuth()
  const webView = useRef<WebView>(null)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [onboardingSeen, setOnboardingSeen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [currentUrl, setCurrentUrl] = useState(WAITS_APP_URL)
  const currentUrlRef = useRef(WAITS_APP_URL)
  const [showPaywall, setShowPaywall] = useState(false)
  const signingOut = useRef(false)
  const isWaitsUrl = (url: string) => {
    try { return new URL(url).origin === new URL(WAITS_APP_URL).origin }
    catch { return false }
  }

  useEffect(() => {
    void AsyncStorage.getItem(ONBOARDING_SEEN_KEY).then((value) => {
      setOnboardingSeen(value === 'true')
      setOnboardingChecked(true)
    }).catch(() => {
      // A storage failure must not strand the user on the launch spinner.
      setOnboardingChecked(true)
    })
  }, [])

  if (!onboardingChecked || authLoading) {
    return <View style={styles.loading}><Image source={WAITS_ICON} style={styles.mark} /><ActivityIndicator color="#ADFF18" style={styles.spinner} /></View>
  }
  if (!onboardingSeen) return <Redirect href="/onboarding" />
  if (!session) return <Redirect href="/(auth)/sign-in" />

  const isInsideWaits = isWaitsUrl(currentUrl)
  const showAuthBack = canGoBack && !isInsideWaits

  const retry = () => {
    setFailed(false)
    setLoading(true)
    webView.current?.reload()
  }

  const sendToWeb = (message: Record<string, string>) => {
    if (!isWaitsUrl(currentUrlRef.current)) return
    const serialized = JSON.stringify(JSON.stringify(message))
    webView.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message', { data: ${serialized} })); true;`,
    )
  }

  const signInWithApple = async () => {
    try {
      const rawNonce = Crypto.randomUUID()
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      )
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      })

      if (!credential.identityToken) throw new Error('Apple did not return an identity token.')

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      })
      if (error) throw error
      if (!data.session) throw new Error('WAITS could not create your Apple session.')

      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
      if (fullName) {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            given_name: credential.fullName?.givenName,
            family_name: credential.fullName?.familyName,
          },
        })
      }

      sendToWeb({
        type: 'WAITS_APPLE_SESSION',
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      })
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
        sendToWeb({ type: 'WAITS_APPLE_SIGN_IN_CANCELLED' })
        return
      }
      sendToWeb({
        type: 'WAITS_APPLE_SIGN_IN_ERROR',
        error: 'Apple sign in could not be completed. Please try again.',
      })
    }
  }

  const handleWebMessage = (event: WebViewMessageEvent) => {
    if (!isWaitsUrl(event.nativeEvent.url)) return
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string }
      if (message.type === 'WAITS_NATIVE_SIGN_OUT' && !signingOut.current) {
        signingOut.current = true
        setShowPaywall(false)
        void signOut().catch(() => {
          sendToWeb({ type: 'WAITS_NATIVE_SIGN_OUT_ERROR', error: 'Sign out could not be completed. Please try again.' })
        }).finally(() => { signingOut.current = false })
        return
      }
      if (message.type === 'WAITS_NATIVE_APPLE_SIGN_IN') void signInWithApple()
      if (message.type === 'WAITS_NATIVE_OPEN_PAYWALL') setShowPaywall(true)
      if (message.type === 'WAITS_NATIVE_MANAGE_SUBSCRIPTIONS') {
        void Linking.openURL('https://apps.apple.com/account/subscriptions')
      }
    } catch {
      // Ignore unrelated WebView messages.
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <WebView
        ref={webView}
        source={{ uri: WAITS_APP_URL }}
        style={styles.webView}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        startInLoadingState={false}
        onLoadStart={() => {
          setLoading(true)
          setFailed(false)
        }}
        onLoadEnd={(event) => {
          setLoading(false)
          if (session && !signingOut.current && isWaitsUrl(event.nativeEvent.url)) {
            sendToWeb({ type: 'WAITS_APPLE_SESSION', accessToken: session.access_token, refreshToken: session.refresh_token })
          }
        }}
        onError={() => {
          setLoading(false)
          setFailed(true)
        }}
        onNavigationStateChange={(navigation: WebViewNavigation) => {
          currentUrlRef.current = navigation.url
          setCanGoBack(navigation.canGoBack)
          setCurrentUrl(navigation.url)
        }}
        onMessage={handleWebMessage}
        applicationNameForUserAgent="WAITS-iOS"
      />

      {showAuthBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to WAITS sign in"
          onPress={() => webView.current?.goBack()}
          style={styles.authBack}
        >
          <Text style={styles.authBackArrow}>‹</Text>
          <Text style={styles.authBackText}>WAITS</Text>
        </Pressable>
      ) : null}

      {loading ? (
        <View style={styles.loading} pointerEvents="none">
          <Image source={WAITS_ICON} style={styles.mark} accessibilityLabel="WAITS logo" />
          <Text style={styles.wordmark}>WAITS</Text>
          <ActivityIndicator color="#A8FF1A" style={styles.spinner} />
        </View>
      ) : null}

      {failed ? (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>WAITS couldn’t connect.</Text>
          <Text style={styles.errorBody}>Check your internet connection and try again.</Text>
          <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      ) : null}

      <AdaptyPaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onEntitlementChanged={() => {
          void refreshProfile()
          sendToWeb({ type: 'WAITS_ENTITLEMENT_CHANGED' })
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  webView: { flex: 1, backgroundColor: '#000000' },
  authBack: {
    position: 'absolute',
    top: 14,
    left: 14,
    minWidth: 92,
    height: 44,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#111111',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  authBackArrow: { marginTop: -2, marginRight: 5, color: '#A8FF1A', fontSize: 30, lineHeight: 32, fontWeight: '500' },
  authBackText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
  loading: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  mark: { width: 72, height: 72, borderRadius: 18 },
  wordmark: { marginTop: 12, color: '#FFFFFF', fontSize: 38, fontWeight: '900', letterSpacing: 2 },
  spinner: { marginTop: 22 },
  error: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#000000',
  },
  errorTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  errorBody: { marginTop: 8, color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 21, textAlign: 'center' },
  retryButton: { height: 52, marginTop: 24, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#A8FF1A' },
  retryText: { color: '#111318', fontSize: 14, fontWeight: '900' },
})
