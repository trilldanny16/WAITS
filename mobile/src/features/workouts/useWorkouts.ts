import { useCallback, useEffect, useRef, useState } from 'react'

import { supabase } from '@/lib/supabase'

import { fetchWorkoutFeed, type WorkoutFeedItem } from './repository'

export type { WorkoutFeedItem } from './repository'

export interface UseWorkoutsResult {
  workouts: WorkoutFeedItem[]
  loading: boolean
  refreshing: boolean
  error: string | null
  isEmpty: boolean
  refresh: () => Promise<void>
}

export function useWorkouts(): UseWorkoutsResult {
  const [workouts, setWorkouts] = useState<WorkoutFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(false)
  const requestRef = useRef(0)

  const load = useCallback(async (isRefresh: boolean) => {
    const requestId = ++requestRef.current
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError) throw new Error(userError.message)
      if (!data.user) throw new Error('Sign in to see upcoming workouts.')

      const nextWorkouts = await fetchWorkoutFeed(data.user.id)
      if (mountedRef.current && requestId === requestRef.current) {
        setWorkouts(nextWorkouts)
      }
    } catch (cause) {
      if (mountedRef.current && requestId === requestRef.current) {
        setError(cause instanceof Error ? cause.message : 'Workouts could not be loaded.')
      }
    } finally {
      if (mountedRef.current && requestId === requestRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  const refresh = useCallback(() => load(true), [load])

  useEffect(() => {
    mountedRef.current = true
    void load(false)

    return () => {
      mountedRef.current = false
      // Invalidates any request that settles after unmount.
      requestRef.current += 1
    }
  }, [load])

  return {
    workouts,
    loading,
    refreshing,
    error,
    isEmpty: !loading && !error && workouts.length === 0,
    refresh,
  }
}

