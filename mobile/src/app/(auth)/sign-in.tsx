import { useState } from 'react'
import { Redirect, router } from 'expo-router'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { colors } from '@/theme'

export default function SignIn() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (!loading && user) return <Redirect href="/" />

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || password.length < 8) {
      setMessage('Enter your email and a password with at least 8 characters.')
      return
    }
    setSubmitting(true)
    setMessage(null)
    const result = creating
      ? await supabase.auth.signUp({ email: normalizedEmail, password })
      : await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    setSubmitting(false)
    if (result.error) {
      setMessage(result.error.message)
      return
    }
    if (creating && !result.data.session) {
      setMessage('Check your email to confirm your WAITS account, then sign in.')
      setCreating(false)
      return
    }
    router.replace('/')
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View>
          <Text style={styles.logo}>WAITS</Text>
          <Text style={styles.tagline}>Never lift alone.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{creating ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>{creating ? 'Join friends who already have a gym membership.' : 'Sign in to your workouts, chats, and schedule.'}</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="Email" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete={creating ? 'new-password' : 'current-password'} placeholder="Password" placeholderTextColor={colors.muted} style={styles.input} />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable onPress={() => void submit()} disabled={submitting} style={({ pressed }) => [styles.primary, pressed && styles.pressed, submitting && styles.disabled]}>
            {submitting ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryText}>{creating ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>}
          </Pressable>
          <Pressable onPress={() => { setCreating((value) => !value); setMessage(null) }} style={styles.switchButton}>
            <Text style={styles.switchText}>{creating ? 'Already have an account? Sign in' : 'New to WAITS? Create an account'}</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>WAITS coordinates workouts at gyms where members already have access. WAITS does not sell gym memberships.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 42, paddingBottom: 24 },
  logo: { color: colors.blue, fontSize: 48, fontWeight: '900', fontStyle: 'italic', letterSpacing: -2.5 },
  tagline: { marginTop: 4, color: colors.ink, fontSize: 18, fontWeight: '700' },
  card: { padding: 22, borderRadius: 30, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { marginTop: 6, marginBottom: 18, color: colors.muted, fontSize: 14, lineHeight: 20 },
  input: { height: 52, marginTop: 10, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 16, color: colors.ink, fontSize: 16 },
  message: { marginTop: 12, color: '#D92D20', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  primary: { height: 52, marginTop: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.lime },
  primaryText: { color: colors.ink, fontSize: 14, fontWeight: '900', letterSpacing: 0.4 },
  switchButton: { paddingTop: 17, paddingBottom: 3, alignItems: 'center' },
  switchText: { color: colors.blue, fontSize: 14, fontWeight: '700' },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
  disabled: { opacity: 0.55 },
  disclaimer: { paddingHorizontal: 10, textAlign: 'center', color: colors.muted, fontSize: 11, lineHeight: 16 },
})

