import { Redirect, Tabs } from 'expo-router'
import { colors } from '@/theme'
import { useAuth } from '@/providers/AuthProvider'

export default function TabLayout() {
  const { user, profile, loading } = useAuth()
  if (!loading && !user) return <Redirect href="/(auth)/sign-in" />
  if (!loading && !profile?.onboarding_completed) return <Redirect href="/onboarding" />
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 82, paddingBottom: 20, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="create" options={{ title: 'New' }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}

