import { useState } from 'react'
import { router } from 'expo-router'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { colors } from '@/theme'

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [gym, setGym] = useState(profile?.home_gym ?? '')
  const [city, setCity] = useState(profile?.city ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finish = async () => {
    if (saving) return
    const displayName = name.trim()
    const homeGym = gym.trim()
    const homeCity = city.trim()
    if (!user) {
      setError('Your session expired. Sign in again to finish your profile.')
      return
    }
    if (displayName.length < 2 || homeGym.length < 2 || homeCity.length < 2) {
      setError('Add your name, gym, and city to continue.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error: updateError } = await supabase.from('profiles').update({
        display_name: displayName,
        home_gym: homeGym,
        city: homeCity,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)
      if (updateError) {
        setError('We could not save your profile. Check your connection and try again.')
        return
      }
      await refreshProfile()
      router.replace('/(tabs)')
    } catch {
      setError('WAITS could not connect. Check your internet connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.logo}>WAITS</Text>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>This helps friends recognize you and understand where you normally train.</Text>
        <TextInput value={name} onChangeText={setName} editable={!saving} autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="next" placeholder="Display name" placeholderTextColor={colors.muted} style={styles.input} maxLength={50} accessibilityLabel="Display name" />
        <TextInput value={gym} onChangeText={setGym} editable={!saving} autoCapitalize="words" returnKeyType="next" placeholder="Home gym" placeholderTextColor={colors.muted} style={styles.input} maxLength={80} accessibilityLabel="Home gym" />
        <TextInput value={city} onChangeText={setCity} editable={!saving} autoCapitalize="words" textContentType="addressCity" returnKeyType="done" onSubmitEditing={() => void finish()} placeholder="City" placeholderTextColor={colors.muted} style={styles.input} maxLength={80} accessibilityLabel="City" />
        {error ? <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text> : null}
        <Pressable onPress={() => void finish()} disabled={saving} accessibilityRole="button" accessibilityLabel="Continue to WAITS" accessibilityState={{ disabled: saving, busy: saving }} style={({ pressed }) => [styles.button, pressed && !saving && styles.pressed, saving && styles.disabled]}>
          {saving ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.buttonText}>CONTINUE</Text>}
        </Pressable>
        <Text style={styles.note}>Your exact workout location is only shared according to each workout's privacy setting.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { color: colors.blue, fontSize: 31, fontWeight: '900', fontStyle: 'italic' },
  title: { marginTop: 18, color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 7, marginBottom: 20, color: colors.muted, fontSize: 15, lineHeight: 22 },
  input: { height: 54, marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 16, color: colors.ink, fontSize: 16 },
  error: { marginTop: 14, color: '#D92D20', fontSize: 13, fontWeight: '600' },
  button: { height: 54, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.lime },
  buttonText: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
  disabled: { opacity: 0.55 },
  note: { marginTop: 16, textAlign: 'center', color: colors.muted, fontSize: 11, lineHeight: 16 },
})

