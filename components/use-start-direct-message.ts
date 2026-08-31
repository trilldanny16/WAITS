'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useStore } from './store'
import { useNav } from './navigation'

/** Database policies remain authoritative for connection and Pro access. */
export function useStartDirectMessage() {
  const { currentUserId, isPremium, pushToast } = useStore()
  const { openDm, openPaywall } = useNav()
  const busy = useRef(false)
  const [startingDm, setStartingDm] = useState<string | null>(null)

  const startDirectMessage = async (otherId: string) => {
    if (busy.current || !currentUserId || otherId === currentUserId) return
    if (!isPremium) { openPaywall('Personal DMs'); return }
    busy.current = true
    setStartingDm(otherId)
    try {
      const [participantA, participantB] = [currentUserId, otherId].sort()
      const findExisting = () => supabase.from('direct_conversations')
        .select('id')
        .eq('participant_a', participantA)
        .eq('participant_b', participantB)
        .maybeSingle()
      const existing = await findExisting()
      if (existing.error) throw existing.error
      if (existing.data) {
        openDm(existing.data.id)
        return
      }
      const created = await supabase.from('direct_conversations')
        .insert({ participant_a: participantA, participant_b: participantB, created_by: currentUserId })
        .select('id').single()
      if (created.error || !created.data) {
        // A second device may have created the same conversation first.
        const retry = await findExisting()
        if (retry.data) {
          openDm(retry.data.id)
          return
        }
        throw created.error ?? new Error('Could not start this conversation.')
      }
      openDm(created.data.id)
    } catch {
      pushToast({
        title: 'DM unavailable',
        body: 'Both members need an active Pro membership and an accepted connection.',
      })
    } finally {
      busy.current = false
      setStartingDm(null)
    }
  }

  return { startDirectMessage, startingDm }
}
