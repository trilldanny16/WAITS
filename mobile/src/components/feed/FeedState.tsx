import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { colors } from '@/theme'

type FeedStateProps =
  | { kind: 'loading' }
  | { kind: 'empty'; onRefresh: () => void }
  | { kind: 'error'; message: string; onRefresh: () => void }

export function FeedState(props: FeedStateProps) {
  if (props.kind === 'loading') {
    return <View style={styles.container} accessibilityLabel="Loading workouts"><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.title}>Finding your next workout…</Text></View>
  }
  const isError = props.kind === 'error'
  return (
    <View style={styles.container}>
      <View style={[styles.icon, isError && styles.errorIcon]}><Text style={styles.iconText}>{isError ? '!' : '＋'}</Text></View>
      <Text style={styles.title}>{isError ? 'Couldn’t load workouts' : 'Your feed is ready'}</Text>
      <Text style={styles.message}>{isError ? props.message : 'Follow people or create a workout to get things moving.'}</Text>
      <Pressable accessibilityRole="button" onPress={props.onRefresh} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}><Text style={styles.retryText}>{isError ? 'Try again' : 'Refresh'}</Text></Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { minHeight: 360, paddingHorizontal: 36, alignItems: 'center', justifyContent: 'center', gap: 12 },
  icon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF4FF' },
  errorIcon: { backgroundColor: '#FFEAEA' },
  iconText: { color: colors.blue, fontSize: 28, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retry: { minWidth: 132, minHeight: 44, marginTop: 8, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  retryText: { color: colors.card, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.75 },
})

