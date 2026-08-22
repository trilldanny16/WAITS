'use client'

import { Ban, Flag } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useStore } from './store'

type ReportTarget = 'user' | 'workout' | 'community_message' | 'crew_message' | 'direct_message' | 'gallery_photo'

export function SafetyActions({
  targetType,
  targetId,
  targetName,
  blockUserId,
  onBlocked,
}: {
  targetType: ReportTarget
  targetId: string
  targetName: string
  blockUserId?: string
  onBlocked?: () => void
}) {
  const { currentUserId, pushToast } = useStore()
  const [busy, setBusy] = useState(false)

  const report = async () => {
    const reason = window.prompt(
      'Why are you reporting this? Enter: harassment, spam, unsafe_behavior, inappropriate_content, impersonation, or other.',
      'other',
    )
    if (!reason) return
    const allowed = ['harassment', 'spam', 'unsafe_behavior', 'inappropriate_content', 'impersonation', 'other']
    if (!allowed.includes(reason)) {
      pushToast({ title: 'Choose a valid report reason' })
      return
    }
    setBusy(true)
    const { error } = await supabase.from('content_reports').insert({
      reporter_id: currentUserId,
      target_type: targetType,
      target_id: targetId,
      reason,
    })
    setBusy(false)
    pushToast(error
      ? { title: 'Report not sent', body: error.message }
      : { title: 'Report sent', body: 'Thank you. The WAITS safety team can review it.' })
  }

  const block = async () => {
    if (!blockUserId || !window.confirm(`Block ${targetName}? You will no longer see each other, and existing connections, chats, attendance, and invitations will be removed.`)) return
    setBusy(true)
    const { error } = await supabase.from('user_blocks').insert({
      blocker_id: currentUserId,
      blocked_id: blockUserId,
    })
    setBusy(false)
    if (error) {
      pushToast({ title: 'Could not block user', body: error.message })
      return
    }
    pushToast({ title: `${targetName} blocked` })
    onBlocked?.()
  }

  return (
    <div className="mt-3 flex justify-center gap-3">
      <button type="button" onClick={() => void report()} disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground disabled:opacity-50">
        <Flag size={14} /> Report
      </button>
      {blockUserId ? (
        <button type="button" onClick={() => void block()} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-4 py-2 text-xs font-bold text-red-500 disabled:opacity-50">
          <Ban size={14} /> Block
        </button>
      ) : null}
    </div>
  )
}
