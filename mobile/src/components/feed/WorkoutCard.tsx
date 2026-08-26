import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import type { WorkoutFeedItem } from '@/features/workouts/useWorkouts'
import { colors } from '@/theme'

type Props = { workout: WorkoutFeedItem; section: 'today' | 'week'; onPress: (workout: WorkoutFeedItem) => void; onWaitUp: (workout: WorkoutFeedItem) => void }

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') }
function formatTime(time: string) { const [hours = '0', minutes = '00'] = time.split(':'); const hour = Number(hours); return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}` }
function formatDate(date: string) { return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`)).toUpperCase() }

export function WorkoutCard({ workout, section, onPress, onWaitUp }: Props) {
  const joined = workout.isJoined || workout.isHostedByViewer
  const actionLabel = workout.isHostedByViewer ? 'HOSTING' : workout.isJoined ? 'JOINED' : 'WAIT UP!'
  const full = workout.spotsRemaining <= 0 && !joined
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${workout.host.displayName} at ${workout.gym}, ${formatTime(workout.time)}`} onPress={() => onPress(workout)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.topRow}>
        {workout.host.avatarUrl ? <Image source={{ uri: workout.host.avatarUrl }} style={styles.avatar} accessibilityIgnoresInvertColors /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitials}>{initials(workout.host.displayName)}</Text></View>}
        <View style={styles.hostDetails}><Text style={styles.hostName} numberOfLines={1}>{workout.host.displayName}</Text><Text style={styles.gym} numberOfLines={1}>⌖ {workout.gym}</Text></View>
        <View style={styles.timeDetails}><Text style={styles.time}>◷ {formatTime(workout.time)}</Text>{section === 'week' ? <Text style={styles.date}>{formatDate(workout.date)}</Text> : null}</View>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.tags}>{workout.workoutTypes.slice(0, 2).map((type) => <View key={type} style={styles.tag}><Text style={styles.tagText}>{type}</Text></View>)}</View>
        <Text style={styles.capacity}>♙ {workout.attendeeCount}/{workout.maxParticipants}</Text>
      </View>
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={full ? 'Workout is full' : actionLabel} disabled={joined || full} onPress={(event) => { event.stopPropagation(); onWaitUp(workout) }} style={({ pressed }) => [styles.waitButton, section === 'today' && styles.fullWidth, (joined || full) && styles.waitButtonDisabled, pressed && styles.buttonPressed]}>
          <Text style={[styles.waitText, (joined || full) && styles.waitTextDisabled]}>{full ? 'FULL' : actionLabel}</Text>
        </Pressable>
        {section === 'week' ? <View style={styles.visibility} accessibilityLabel={`${workout.visibility} workout`}><Text style={styles.visibilityText}>{workout.visibility.toUpperCase()}</Text></View> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 16, shadowColor: '#1B2430', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
  cardPressed: { transform: [{ scale: 0.995 }] },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  avatarInitials: { color: colors.card, fontSize: 14, fontWeight: '900' },
  hostDetails: { flex: 1, minWidth: 0, marginLeft: 12, marginRight: 8 },
  hostName: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  gym: { color: colors.muted, fontSize: 12, marginTop: 5 },
  timeDetails: { alignItems: 'flex-end', gap: 6 },
  time: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  date: { color: colors.muted, fontSize: 9, letterSpacing: 1.6, fontWeight: '700' },
  metaRow: { minHeight: 36, marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tags: { flex: 1, flexDirection: 'row', gap: 6 },
  tag: { borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#E6F2FF' },
  tagText: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  capacity: { color: colors.muted, fontSize: 11, fontWeight: '700', marginLeft: 8 },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 8 },
  waitButton: { flex: 2, minHeight: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lime },
  fullWidth: { flex: 1 },
  waitButtonDisabled: { backgroundColor: '#E6E6ED' },
  waitText: { color: colors.ink, fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
  waitTextDisabled: { color: colors.muted },
  visibility: { flex: 1, minHeight: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F5' },
  visibilityText: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  buttonPressed: { opacity: 0.72 },
})

