import { useEffect, useRef, useState } from 'react'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { Redirect, router } from 'expo-router'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { colors } from '@/theme'
import { completePendingOnboarding } from '@/features/onboarding/draft'
import Svg, { Path, SvgXml } from 'react-native-svg'
import { WAITS_CLOCK_LOGO_XML } from '../../../assets/waits-clock-logo'

const GOOGLE_REDIRECT = 'waits://sign-in'
WebBrowser.maybeCompleteAuthSession()

function GoogleGlyph() {
  return <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
    <Path fill="#4285F4" d="M23.52 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.71z" />
    <Path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24z" />
    <Path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76z" />
    <Path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
  </Svg>
}

function SignInLogo() {
  return <View pointerEvents="none" accessible accessibilityLabel="WAITS clock and weights logo" style={styles.brand}>
    <SvgXml xml={WAITS_CLOCK_LOGO_XML} width={144} height={92} />
    <Text style={styles.wordmark}>WAITS</Text>
  </View>
}

export default function SignIn() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [appleSubmitting, setAppleSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const initialCallbackHandled = useRef(false)
  const passwordInput = useRef<TextInput>(null)
  const busy = submitting || appleSubmitting || googleSubmitting
  const googleLabel = creating ? 'Sign up with Google' : 'Sign in with Google'

  useEffect(() => {
    let disposed = false
    const finishGoogleSignIn = async ({ url }: { url: string }) => {
      const callback = new URL(url)
      if (disposed || initialCallbackHandled.current || callback.protocol !== 'waits:' || callback.hostname !== 'sign-in' || callback.pathname !== '') return
      const code = callback.searchParams.get('code')
      if (!code || callback.searchParams.has('error')) return
      initialCallbackHandled.current = true
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error || !data.user) {
        setMessage('Google sign in could not be completed. Please try again.')
        setGoogleSubmitting(false)
        return
      }
      await completePendingOnboarding(data.user.id)
      router.replace('/')
    }
    void Linking.getInitialURL().then(async url => { if (url) await finishGoogleSignIn({ url }) }).catch(() => {
      if (!disposed) setMessage('Google sign in could not be completed. Please try again.')
    })
    return () => { disposed = true }
  }, [])

  if (!loading && user) return <Redirect href="/" />

  const submit = async () => {
    if (busy) return
    const normalizedEmail = email.trim().toLowerCase()
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    if (!looksLikeEmail || !password || (creating && password.length < 8)) {
      setMessage(creating ? 'Enter your email and a password with at least 8 characters.' : 'Enter a valid email address and your password.')
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const result = creating
        ? await supabase.auth.signUp({ email: normalizedEmail, password })
        : await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      if (result.error) {
        setMessage(creating
          ? 'We could not create that account. Check your details and try again.'
          : 'We could not sign you in. Check your email and password and try again.')
        return
      }
      if (creating && !result.data.session) {
        setMessage('Check your email to confirm your WAITS account, then sign in.')
        setCreating(false)
        setPassword('')
        setShowPassword(false)
        return
      }
      if (result.data.user) await completePendingOnboarding(result.data.user.id)
      router.replace('/')
    } catch {
      setMessage('WAITS could not connect. Check your internet connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const signInWithApple = async () => {
    if (busy) return
    setAppleSubmitting(true)
    setMessage(null)
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

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      })
      if (error) throw error

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
      const { data: { user: signedInUser } } = await supabase.auth.getUser()
      if (signedInUser) await completePendingOnboarding(signedInUser.id)
      router.replace('/')
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') return
      setMessage('Apple sign in could not be completed. Please try again.')
    } finally {
      setAppleSubmitting(false)
    }
  }

  const signInWithGoogle = async () => {
    if (busy) return
    setGoogleSubmitting(true)
    setMessage(null)
    try {
      const redirectTo = GOOGLE_REDIRECT
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error || !data.url) throw error ?? new Error('Google sign in URL was unavailable.')
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type !== 'success') return
      const callback = new URL(result.url)
      if (callback.protocol !== 'waits:' || callback.hostname !== 'sign-in' || callback.pathname !== '') throw new Error('Unexpected Google callback')
      const code = callback.searchParams.get('code')
      if (!code || callback.searchParams.has('error')) throw new Error('Google did not return a sign-in code')
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      if (sessionError || !sessionData.user) throw sessionError ?? new Error('No Google session')
      await completePendingOnboarding(sessionData.user.id)
      router.replace('/')
    } catch {
      setMessage('Google sign in could not be completed. Please try again.')
      setGoogleSubmitting(false)
    } finally {
      setGoogleSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.backRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => { if (creating) { setCreating(false); setPassword(''); setShowPassword(false); setMessage(null) } else { router.replace('/onboarding') } }} style={styles.backButton}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>‹ Back</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <SignInLogo />
          <Text accessibilityRole="header" style={styles.title}>{creating ? 'Create an account' : 'Log in'}</Text>
        </View>

        <View style={styles.actions}>
        <View style={styles.card}>
          <TextInput value={email} onChangeText={setEmail} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()} placeholder="Email" placeholderTextColor="rgba(255,255,255,0.8)" style={styles.input} accessibilityLabel="Email address" />
          <View style={styles.passwordRow}>
            <TextInput ref={passwordInput} value={password} onChangeText={setPassword} editable={!busy} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete={creating ? 'new-password' : 'current-password'} returnKeyType="go" onSubmitEditing={() => void submit()} placeholder="Password" placeholderTextColor="rgba(255,255,255,0.8)" style={styles.passwordInput} accessibilityLabel="Password" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              onPress={() => setShowPassword((visible) => !visible)}
              style={styles.passwordToggle}
            >
              <Text style={styles.switchText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
          {message ? <Text style={styles.message} accessibilityRole="alert" accessibilityLiveRegion="polite">{message}</Text> : null}
          <Pressable onPress={() => void submit()} disabled={busy} accessibilityRole="button" accessibilityLabel={creating ? 'Create account' : 'Sign in'} accessibilityState={{ disabled: busy, busy: submitting }} style={({ pressed }) => [styles.primary, pressed && !submitting && styles.pressed, submitting && styles.disabled]}>
            {submitting ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryText}>{creating ? 'Create account' : 'Log in'}</Text>}
          </Pressable>
          <Pressable disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }} onPress={() => { setCreating((value) => !value); setMessage(null); setPassword(''); setShowPassword(false) }} style={styles.switchButton}>
            <Text style={styles.switchText}>{creating ? 'Already have an account? Sign in' : 'New to WAITS? Create an account'}</Text>
          </Pressable>
          <View style={styles.social}>
          {Platform.OS === 'ios' ? (
            <>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={creating ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={17}
                style={[styles.appleButton, appleSubmitting && styles.disabled]}
                onPress={() => void signInWithApple()}
              />
            </>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel={googleLabel} accessibilityState={{ disabled: busy, busy: googleSubmitting }} onPress={() => void signInWithGoogle()} disabled={busy} style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, googleSubmitting && styles.disabled]}>
            {googleSubmitting ? <ActivityIndicator color="#000000" /> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><GoogleGlyph /><Text style={styles.googleText}>{googleLabel}</Text></View>}
          </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.disclaimer}>Train at gyms where you already have membership or guest access. WAITS does not sell gym memberships.</Text>
          <Text style={styles.legalIntro}>By continuing, you agree to our</Text>
          <View style={styles.legalLinks}>
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://come-thru-gym-bud.vercel.app/terms')} style={styles.legalLink}><Text style={styles.legalText}>Terms of Service</Text></Pressable>
            <Text style={styles.legalSeparator}>·</Text>
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://come-thru-gym-bud.vercel.app/privacy')} style={styles.legalLink}><Text style={styles.legalText}>Privacy Policy</Text></Pressable>
          </View>
        </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  backRow: { height: 48, zIndex: 30, justifyContent: 'center', alignItems: 'flex-start' },
  backButton: { minWidth: 80, minHeight: 44, justifyContent: 'center' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20, gap: 14 },
  hero: { alignItems: 'center', paddingVertical: 12 },
  brand: { alignItems: 'center' },
  wordmark: { color: '#FFFFFF', marginTop: 16, fontSize: 30, fontWeight: '900', letterSpacing: 2 },
  actions: { gap: 16 },
  card: { paddingVertical: 12 },
  title: { marginTop: 14, textAlign: 'center', color: '#FFFFFF', fontSize: 25, fontWeight: '900', letterSpacing: -0.5 },
  appleButton: { width: '100%', height: 48 },
  googleButton: { height: 48, marginTop: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#FFFFFF' },
  googleText: { color: '#000000', fontSize: 18, fontWeight: '700' },
  input: { height: 52, marginTop: 10, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: '#202020', paddingHorizontal: 16, color: '#FFFFFF', fontSize: 16 },
  social: { marginTop: 14 },
  passwordRow: { minHeight: 52, marginTop: 10, flexDirection: 'row', borderRadius: 17, borderWidth: 1, borderColor: '#393939', backgroundColor: '#202020' },
  passwordInput: { flex: 1, minWidth: 0, paddingHorizontal: 16, color: '#FFFFFF', fontSize: 16 },
  passwordToggle: { minWidth: 64, minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  message: { marginTop: 12, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 12, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  primary: { height: 52, marginTop: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.lime },
  primaryText: { color: colors.ink, fontSize: 14, fontWeight: '900', letterSpacing: 0.4 },
  switchButton: { paddingTop: 17, paddingBottom: 3, alignItems: 'center' },
  switchText: { color: colors.lime, fontSize: 14, fontWeight: '700' },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
  disabled: { opacity: 0.55 },
  footer: { alignItems: 'center', gap: 8 },
  disclaimer: { paddingHorizontal: 8, textAlign: 'center', color: 'rgba(255,255,255,0.88)', fontSize: 12, lineHeight: 18 },
  legalIntro: { color: 'rgba(255,255,255,0.88)', fontSize: 12 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  legalLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  legalText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  legalSeparator: { color: '#FFFFFF' },
})
