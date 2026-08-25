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
    if (!user || name.trim().length < 2 || gym.trim().length < 2 || city.trim().length < 2) {
      setError('Add your name, gym, and city to continue.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase.from('profiles').update({
      display_name: name.trim(),
      home_gym: gym.trim(),
      city: city.trim(),
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }
    await refreshProfile()
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.logo}>WAITS</Text>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>This helps friends recognize you and understand where you normally train.</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={colors.muted} style={styles.input} maxLength={50} />
        <TextInput value={gym} onChangeText={setGym} placeholder="Home gym" placeholderTextColor={colors.muted} style={styles.input} maxLength={80} />
        <TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.muted} style={styles.input} maxLength={80} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={() => void finish()} disabled={saving} style={styles.button}>
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
  note: { marginTop: 16, textAlign: 'center', color: colors.muted, fontSize: 11, lineHeight: 16 },
})

