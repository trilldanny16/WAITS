'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, Send, Users } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../navigation'
import { Avatar } from '../avatar'
import { formatTime, formatDateLabel, relativeMessageTime } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'

type CrewMessage = { id: string; workout_id: string; user_id: string; text: string; created_at: string }

export function Chat({ id }: { id: string }) {
  const { workouts, getUser, currentUserId, pushToast } = useStore()
  const { back } = useNav()
  const workout = workouts.find((candidate) => candidate.id === id)
  const [messages, setMessages] = useState<CrewMessage[]>([])
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('crew_messages').select('id, workout_id, user_id, text, created_at').eq('workout_id', id).order('created_at')
    if (error) pushToast({ title: 'Crew chat unavailable', body: error.message })
    else setMessages(data ?? [])
  }, [id, pushToast])

  useEffect(() => {
    void load()
    const channel = supabase.channel(`crew:${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'crew_messages', filter: `workout_id=eq.${id}` }, () => void load()).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [id, load])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }, [messages.length])

  if (!workout) return <div className="flex h-full items-center justify-center"><button onClick={back}>Go back</button></div>
  const host = getUser(workout.hostId)

  const send = async () => {
    const trimmed = text.trim(); if (!trimmed || busy) return
    setBusy(true)
    const result = await supabase.from('crew_messages').insert({ workout_id: id, user_id: currentUserId, text: trimmed }).select('id').single()
    if (result.error) pushToast({ title: 'Message not sent', body: result.error.message }); else setText('')
    setBusy(false)
  }
  const save = async (messageId: string) => {
    const trimmed = editText.trim(); if (!trimmed) return
    const result = await supabase.from('crew_messages').update({ text: trimmed }).eq('id', messageId).eq('user_id', currentUserId).select('id').single()
    if (result.error) pushToast({ title: 'Edit failed', body: result.error.message }); else { setEditingId(null); setEditText('') }
  }
  const remove = async (messageId: string) => {
    const result = await supabase.from('crew_messages').delete().eq('id', messageId).eq('user_id', currentUserId).select('id').single()
    if (result.error) pushToast({ title: 'Delete failed', body: result.error.message })
  }

  return <div className="flex h-full flex-col bg-background">
    <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] shadow-sm">
      <button onClick={back} className="flex size-10 items-center justify-center rounded-full bg-secondary" aria-label="Back"><ChevronLeft /></button>
      <div className="min-w-0 flex-1"><p className="truncate text-base font-extrabold">{workout.types.join(' + ')} Â· {host.name.split(' ')[0]}&apos;s crew</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Users size={12}/>{workout.attendees.length} members Â· {formatTime(workout.time)}</p></div>
    </header>
    <div ref={scrollRef} className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-5">
      <p className="mx-auto w-fit rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground">{formatDateLabel(workout.date)} Â· Participants only</p>
      {messages.map((message) => { const mine=message.user_id===currentUserId; const user=getUser(message.user_id); return <div key={message.id} className={cn('flex items-end gap-2.5',mine&&'flex-row-reverse')}>
        {!mine?<Avatar user={user} size={34}/>:null}<div className="max-w-[82%]">{!mine?<p className="mb-1 px-1 text-xs font-semibold">{user.name}</p>:null}
        {editingId===message.id?<div className="rounded-2xl bg-card p-3 ring-1 ring-border"><input value={editText} onChange={(e)=>setEditText(e.target.value)} className="w-full bg-transparent text-sm outline-none" autoFocus/><div className="mt-2 flex gap-3 text-xs font-bold"><button onClick={()=>void save(message.id)} className="text-primary">Save</button><button onClick={()=>setEditingId(null)}>Cancel</button></div></div>:<div className={cn('rounded-3xl px-4 py-3 text-[15px] leading-relaxed shadow-sm',mine?'rounded-br-md bg-primary text-primary-foreground':'rounded-bl-md bg-card ring-1 ring-border')}>{message.text}</div>}
        <div className={cn('mt-1 flex items-center gap-3 px-1 text-[10px] text-muted-foreground',mine&&'justify-end')}><span>{relativeMessageTime(new Date(message.created_at).getTime())}</span>{mine&&editingId!==message.id?<><button onClick={()=>{setEditingId(message.id);setEditText(message.text)}}>Edit</button><button onClick={()=>void remove(message.id)} className="text-destructive">Delete</button></>:null}</div></div></div> })}
    </div>
    <div className="flex items-end gap-2 border-t border-border bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-4"><input value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();void send()}}} placeholder="Message the crewâ€¦" className="min-w-0 flex-1 rounded-2xl bg-secondary px-4 py-3.5 text-sm outline-none"/><button onClick={()=>void send()} disabled={!text.trim()||busy} className="flex size-12 items-center justify-center rounded-2xl bg-lime disabled:opacity-40"><Send size={19}/></button></div>
  </div>
}

