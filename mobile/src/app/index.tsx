import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/providers/AuthProvider'
import { colors } from '@/theme'

export default function Index() {
  const { user, profile, loading } = useAuth()
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.blue} /></View>
  if (!user) return <Redirect href="/(auth)/sign-in" />
  if (!profile?.onboarding_completed) return <Redirect href="/onboarding" />
  return <Redirect href="/(tabs)" />
}

