import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { activateAdapty } from '@/lib/adapty'

export default function RootLayout() {
  useEffect(() => {
    void activateAdapty()
  }, [])

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

