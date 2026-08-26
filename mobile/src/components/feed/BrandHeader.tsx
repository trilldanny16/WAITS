import { StyleSheet, Text, View } from 'react-native'

import { colors } from '@/theme'

type BrandHeaderProps = { isPro?: boolean }

export function BrandHeader({ isPro = false }: BrandHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.wordmark} accessibilityRole="header">
        <View style={styles.mark}><Text style={styles.markText}>⌁</Text></View>
        <Text style={styles.title}>WAITS</Text>
      </View>
      {isPro ? (
        <View style={styles.proBadge} accessibilityLabel="WAITS Pro member">
          <Text style={styles.crown}>♔</Text><Text style={styles.proText}>PRO</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, transform: [{ rotate: '-8deg' }] },
  markText: { color: colors.card, fontSize: 27, lineHeight: 29, fontWeight: '900', transform: [{ rotate: '8deg' }] },
  title: { color: colors.blue, fontSize: 25, letterSpacing: 1.6, fontWeight: '900' },
  proBadge: { minWidth: 62, height: 32, borderRadius: 16, paddingHorizontal: 10, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  crown: { color: colors.card, fontSize: 16, fontWeight: '900' },
  proText: { color: colors.card, fontSize: 10, letterSpacing: 0.7, fontWeight: '900' },
})

