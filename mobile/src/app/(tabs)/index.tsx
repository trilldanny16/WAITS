import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BrandHeader } from '@/components/feed/BrandHeader'
import { FeedState } from '@/components/feed/FeedState'
import { WorkoutCard } from '@/components/feed/WorkoutCard'
import type { WorkoutFeedItem } from '@/features/workouts/useWorkouts'
import { useWorkouts } from '@/features/workouts/useWorkouts'
import { useAuth } from '@/providers/AuthProvider'
import { colors } from '@/theme'

function localDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function Feed() {
  const { profile } = useAuth()
  const { workouts, loading, refreshing, error, refresh } = useWorkouts()
  const todayKey = localDateKey()
  const today = workouts.filter((workout) => workout.date === todayKey)
  const thisWeek = workouts.filter((workout) => workout.date !== todayKey)

  function openWorkout(workout: WorkoutFeedItem) {
    Alert.alert(workout.gym, `${workout.host.displayName} · ${workout.city}`)
  }

  function waitUp(workout: WorkoutFeedItem) {
    Alert.alert('Workout selected', `We’ll open ${workout.host.displayName}’s workout details next.`)
  }

  if (loading && workouts.length === 0) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.shell}><BrandHeader isPro={Boolean(profile?.is_pro)} /><FeedState kind="loading" /></View></SafeAreaView>
  }

  if (error && workouts.length === 0) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.shell}><BrandHeader isPro={Boolean(profile?.is_pro)} /><FeedState kind="error" message={error} onRefresh={() => void refresh()} /></View></SafeAreaView>
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.shell}>
        <BrandHeader isPro={Boolean(profile?.is_pro)} />
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.blue} />}
          showsVerticalScrollIndicator={false}
        >
          {workouts.length === 0 ? <FeedState kind="empty" onRefresh={() => void refresh()} /> : (
            <>
              {today.length > 0 ? <WorkoutSection title="TODAY" workouts={today} section="today" onPress={openWorkout} onWaitUp={waitUp} /> : null}
              {thisWeek.length > 0 ? <WorkoutSection title="THIS WEEK" workouts={thisWeek} section="week" onPress={openWorkout} onWaitUp={waitUp} /> : null}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

type WorkoutSectionProps = { title: string; workouts: WorkoutFeedItem[]; section: 'today' | 'week'; onPress: (workout: WorkoutFeedItem) => void; onWaitUp: (workout: WorkoutFeedItem) => void }

function WorkoutSection({ title, workouts, section, onPress, onWaitUp }: WorkoutSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.cards}>
        {workouts.map((workout) => <WorkoutCard key={workout.id} workout={workout} section={section} onPress={onPress} onWaitUp={onWaitUp} />)}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  shell: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  content: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 32 },
  section: { marginBottom: 25 },
  sectionTitle: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.7, marginLeft: 4, marginBottom: 10 },
  cards: { gap: 12 },
})

