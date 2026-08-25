import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { activateAdapty } from '@/lib/adapty'
import { AuthProvider } from '@/providers/AuthProvider'

export default function RootLayout() {
  useEffect(() => {
    void activateAdapty()
  }, [])

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  )
}

