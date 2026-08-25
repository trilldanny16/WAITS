import { SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { colors } from '@/theme'

export function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>WAITS</Text>
        <View style={styles.proBadge}><Text style={styles.proText}>PRO</Text></View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Native mobile foundation ready</Text>
          <Text style={styles.cardBody}>Supabase sessions, Adapty initialization, and EAS cloud builds are configured for the next checkpoint.</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { color: colors.blue, fontSize: 30, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1.5 },
  proBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  proText: { color: 'white', fontSize: 10, fontWeight: '900' },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 20 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '900', letterSpacing: -0.8 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 7 },
  card: { marginTop: 24, padding: 20, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  cardBody: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
})

