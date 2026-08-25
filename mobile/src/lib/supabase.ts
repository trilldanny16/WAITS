import 'react-native-url-polyfill/auto'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'
import { createClient, processLock } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  console.warn('Supabase mobile environment variables are not configured yet.')
}

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', publishableKey ?? 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
})

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})

