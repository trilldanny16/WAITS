import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { activateAdapty } from '@/lib/adapty'
import { AuthProvider } from '@/providers/AuthProvider'

export default function RootLayout() {
  useEffect(() => {
    void activateAdapty().catch(() => console.warn('Purchases could not initialize. They can be retried from WAITS Pro.'))
  }, [])

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }} />
    </AuthProvider>
  )
}
