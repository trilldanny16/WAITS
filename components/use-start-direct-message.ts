'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useStore } from './store'
import { useNav } from './navigation'

/** Database policies remain authoritative for privacy, blocking and Pro access. */
export function useStartDirectMessage() {
  const { currentUserId, isPremium, pushToast } = useStore()
  const { openDm, openPaywall } = useNav()
  const busy = useRef(false)
  const account = useRef(currentUserId)
  account.current = currentUserId
  const [startingDm, setStartingDm] = useState<string | null>(null)

  const startDirectMessage = async (otherId: string) => {
    if (busy.current || !currentUserId || otherId === currentUserId) return false
    if (!isPremium) { openPaywall('Personal DMs'); return false }
    const initiatingUser = currentUserId
    busy.current = true
    setStartingDm(otherId)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || user?.id !== initiatingUser || account.current !== initiatingUser) {
        throw new Error('Your account changed. Please reopen Messages and try again.')
      }
      const [participantA, participantB] = [currentUserId, otherId].sort()
      const findExisting = () => supabase.from('direct_conversations')
        .select('id')
        .eq('participant_a', participantA)
        .eq('participant_b', participantB)
        .maybeSingle()
      const existing = await findExisting()
      if (existing.error) throw existing.error
      if (existing.data) {
        if (account.current !== initiatingUser) return false
        openDm(existing.data.id)
        return true
      }
      const created = await supabase.from('direct_conversations')
        .insert({ participant_a: participantA, participant_b: participantB, created_by: currentUserId })
        .select('id').single()
      if (created.error || !created.data) {
        // A second device may have created the same conversation first.
        const retry = await findExisting()
        if (retry.data) {
          if (account.current !== initiatingUser) return false
          openDm(retry.data.id)
          return true
        }
        throw created.error ?? new Error('Could not start this conversation.')
      }
      if (account.current !== initiatingUser) return false
      openDm(created.data.id)
      return true
    } catch (error) {
      if (account.current === initiatingUser) pushToast({
        title: 'DM unavailable',
        body: error instanceof Error && error.message.includes('account changed')
          ? error.message
          : 'This conversation cannot be opened. Check messaging privacy, your connection, and both members’ Pro access.',
      })
      return false
    } finally {
      busy.current = false
      setStartingDm(null)
    }
  }

  return { startDirectMessage, startingDm }
}
