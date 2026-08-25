import { Pressable, StyleSheet, Text, View } from 'react-native'
import { PlaceholderScreen } from '@/components/PlaceholderScreen'
import { useAuth } from '@/providers/AuthProvider'
import { colors } from '@/theme'

export default function Profile() {
  const { profile, signOut } = useAuth()
  return (
    <View style={styles.screen}>
      <PlaceholderScreen title={profile?.display_name ?? 'Profile'} description={`${profile?.home_gym ?? 'Your gym'} · ${profile?.city ?? 'Your city'}`} />
      <Pressable onPress={() => void signOut()} style={styles.signOut}><Text style={styles.signOutText}>SIGN OUT</Text></Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  signOut: { position: 'absolute', left: 24, right: 24, bottom: 100, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#FF313E' },
  signOutText: { color: colors.card, fontWeight: '900' },
})

