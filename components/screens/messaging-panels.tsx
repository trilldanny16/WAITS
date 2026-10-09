'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, ChevronLeft, LoaderCircle, Search, UsersRound, X, MessageCircle, SquarePen, Settings, ImagePlus, Send } from 'lucide-react'
import { Avatar } from '../avatar'
import { supabase } from '@/lib/supabase-client'
import { ChatMedia } from '../chat-media'
import { relativeMessageTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import type { MessagingInboxItem } from '@/lib/messaging'
import type { User } from '@/lib/types'
import { getMessagingPreferences, saveMessagingPreferences, getMessagingRecipients } from '@/lib/messaging'

export function messagingUser(profile: { id: string; displayName: string; username: string | null; avatarPath: string | null; isPro: boolean }): User {
  return { id: profile.id, name: profile.displayName || 'WAITS User', username: profile.username ?? '', avatar: profile.avatarPath ? (profile.avatarPath.startsWith('https://') ? profile.avatarPath : supabase.storage.from('profile-media').getPublicUrl(profile.avatarPath).data.publicUrl) : undefined, bio: '', city: '', homeGym: '', favoriteSplit: '', hue: 210, isPrivate: false, isVerifiedPro: profile.isPro }
}

export function MessagingHeader({ title, onBack, close = false, children }: { title: string; onBack: () => void; close?: boolean; children?: React.ReactNode }) {
  return <header className="grid shrink-0 grid-cols-[88px_1fr_88px] items-center gap-1 px-4 pb-5 pt-[calc(env(safe-area-inset-top)+16px)]">
    <button type="button" onClick={onBack} aria-label={close ? 'Close New Message' : 'Back'} className="flex size-11 items-center justify-center rounded-full bg-[#17181B] ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-primary">{close ? <X size={23} /> : <ChevronLeft size={26} />}</button>
    <h1 className="text-center text-[19px] font-bold leading-tight tracking-tight">{title}</h1>
    <div className="flex justify-end">{children}</div>
  </header>
}

export function NewMessage({ onBack, onCreate, busy, previewPeople, currentUserId }: { onBack: () => void; onCreate: (id: string) => void; busy: boolean; previewPeople?: User[]; currentUserId?: string }) {
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<User[]>(previewPeople ?? [])
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setSelected(null); setPeople(previewPeople ?? []); setError(null) }, [currentUserId, previewPeople])
  useEffect(() => {
    if (previewPeople) { setPeople(previewPeople.filter((person) => (person.name + ' ' + person.username).toLowerCase().includes(query.toLowerCase()))); setLoading(false); return }
    let active = true
    setLoading(true)
    const timer = window.setTimeout(() => {
      getMessagingRecipients(query.trim()).then((rows) => { if (active) { setPeople(rows.map(messagingUser)); setError(null) } }).catch(() => { if (active) setError('Could not load your friends. Please try again.') }).finally(() => { if (active) setLoading(false) })
    }, query ? 250 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, reload, previewPeople, currentUserId])
  return <div className="flex h-full min-h-0 flex-col bg-[#0E0F11] text-white">
    <MessagingHeader title="New Message" onBack={onBack} close><button type="button" disabled={!selected || busy || loading || Boolean(error)} onClick={() => selected && onCreate(selected)} className="min-h-11 rounded-full bg-lime px-4 text-sm font-bold text-black disabled:bg-white/5 disabled:text-white/30">{busy ? 'Opening…' : 'Create'}</button></MessagingHeader>
    <div className="px-4"><label className="flex h-13 items-center gap-3 rounded-full bg-white/8 px-4 ring-1 ring-white/5"><Search size={21} className="text-white/45" /><input aria-label="Search friends" placeholder="Search friends" value={query} maxLength={100} onChange={(event) => { setQuery(event.target.value); setSelected(null) }} className="h-13 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/45" /></label></div>
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
      {loading ? <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-white/60"><LoaderCircle size={20} className="animate-spin" /> Loading friends…</div> : error ? <div role="alert" className="my-auto text-center text-sm text-destructive">{error}<button type="button" onClick={() => setReload((value) => value + 1)} className="mx-auto mt-4 block min-h-11 rounded-full bg-white/10 px-6 text-white">Try Again</button></div> : people.length === 0 ? <div className="my-auto flex flex-col items-center py-10 text-center"><span className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-primary"><UsersRound size={44} strokeWidth={1.5} /></span><h2 className="mt-6 text-xl font-bold">No Friends Found</h2><p className="mt-2 max-w-64 text-sm leading-relaxed text-white/55">{query ? 'No matching friends. Try another name or username.' : 'Add friends to start a conversation.'}</p></div> : <ul>{people.map((person) => <li key={person.id}><button type="button" aria-pressed={selected === person.id} onClick={() => setSelected(person.id)} disabled={busy} className="flex min-h-20 w-full items-center gap-3 border-b border-white/5 py-4 text-left disabled:opacity-50"><Avatar user={person} size={48} /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{person.name}</span>{person.username ? <span className="block truncate text-sm text-white/50">@{person.username}</span> : null}</span><span className={selected === person.id ? 'flex size-6 items-center justify-center rounded-full bg-primary text-white' : 'size-6 rounded-full border border-white/30'}>{selected === person.id ? <Check size={16} /> : null}</span></button></li>)}</ul>}
    </div>
  </div>
}

const privacyOptions = [
  { value: 'friends', title: 'Friends', description: 'Only accepted friends with Pro can start a conversation with you.' },
  { value: 'everyone', title: 'Everyone', description: 'Allow other WAITS Pro members to start conversations with you.' },
  { value: 'no_one', title: 'No One', description: 'Only you can start new conversations.' },
] as const

export function MessagingSettings({ onBack, previewPreferences, currentUserId }: { onBack: () => void; previewPreferences?: { whoCanMessage: 'friends' | 'everyone' | 'no_one'; showWhenOnline: boolean }; currentUserId?: string }) {
  const account = useRef(currentUserId)
  account.current = currentUserId
  const [preferences, setPreferences] = useState<{ whoCanMessage: 'friends' | 'everyone' | 'no_one'; showWhenOnline: boolean } | null>(previewPreferences ?? null)
  const mounted = useRef(true)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = () => setReload((value) => value + 1)
  useEffect(() => {
    mounted.current = true
    setSaving(false)
    setError(null)
    if (previewPreferences) { setPreferences(previewPreferences); setLoading(false); return () => { mounted.current = false } }
    let active = true
    setPreferences(null)
    setLoading(true)
    getMessagingPreferences(currentUserId).then((value) => { if (active && account.current === currentUserId) setPreferences(value) })
      .catch(() => { if (active && account.current === currentUserId) setError('Could not load messaging settings. Please try again.') })
      .finally(() => { if (active && account.current === currentUserId) setLoading(false) })
    return () => { active = false; mounted.current = false }
  }, [reload, previewPreferences, currentUserId])
  const save = async (next: NonNullable<typeof preferences>) => {
    if (saving) return
    const savingAccount = currentUserId
    setSaving(true)
    setError(null)
    try {
      if (!previewPreferences) await saveMessagingPreferences(next, savingAccount)
      if (mounted.current && account.current === savingAccount) setPreferences(next)
    } catch { if (mounted.current && account.current === savingAccount) setError('Your changes were not saved. Please try again.') }
    finally { if (mounted.current && account.current === savingAccount) setSaving(false) }
  }
  return <div className="flex h-full min-h-0 flex-col bg-[#0E0F11] text-white"><MessagingHeader title="Messaging Settings" onBack={onBack} />
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <p className="mb-8 text-sm leading-relaxed text-white/60">Choose who can start a private conversation with you on WAITS.</p>
      {error ? <p role="alert" className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}{!preferences ? <button type="button" onClick={load} className="ml-2 underline">Try Again</button> : null}</p> : null}
      {loading ? <p role="status" className="py-10 text-center text-sm text-white/60">Loading settings…</p> : preferences ? <>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/45">Online Status</h2>
        <div className="mb-8 flex items-center gap-4 rounded-2xl bg-white/5 p-4"><div className="flex-1"><p className="font-semibold">Show When Online</p><p className="mt-1 text-sm leading-relaxed text-white/55">Let your friends see when you&apos;re active.</p></div><button type="button" role="switch" aria-checked={preferences.showWhenOnline} aria-label="Show When Online" disabled={saving} onClick={() => void save({ ...preferences, showWhenOnline: !preferences.showWhenOnline })} className="flex min-h-11 min-w-14 shrink-0 items-center justify-center disabled:opacity-50"><span className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors ${preferences.showWhenOnline ? 'bg-lime' : 'bg-white/20'}`}><span className={`size-6 rounded-full bg-white shadow transition-transform ${preferences.showWhenOnline ? 'translate-x-6' : ''}`} /></span></button></div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/45">Who Can Message You</h2><div role="radiogroup" aria-label="Who Can Message You" className="overflow-hidden rounded-2xl bg-white/5">{privacyOptions.map((option) => <button key={option.value} type="button" role="radio" aria-checked={preferences.whoCanMessage === option.value} disabled={saving} onClick={() => void save({ ...preferences, whoCanMessage: option.value })} className="flex min-h-24 w-full items-center gap-4 border-b border-white/5 p-4 text-left last:border-b-0 disabled:opacity-60"><span className="flex-1"><span className="block font-semibold">{option.title}</span><span className="mt-1 block text-sm leading-relaxed text-white/55">{option.description}</span></span><span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${preferences.whoCanMessage === option.value ? 'border-primary' : 'border-white/35'}`}>{preferences.whoCanMessage === option.value ? <span className="size-3 rounded-full bg-primary" /> : null}</span></button>)}</div><p role="status" className="mt-4 text-center text-xs text-white/45">{saving ? 'Saving…' : error ? 'Changes were not saved.' : 'Changes are saved to your account.'}</p>
      </> : null}
    </div></div>
}

export function MessagingInboxHeader({ onBack, onCompose, onSettings }: { onBack: () => void; onCompose: () => void; onSettings: () => void }) {
  return <header className="grid shrink-0 grid-cols-[96px_minmax(0,1fr)_96px] items-center gap-y-2 bg-black px-4 pb-4 pt-[calc(env(safe-area-inset-top)+20px)]">
    <button type="button" onClick={onBack} aria-label="Back to Home" className="flex size-11 items-center justify-center rounded-full bg-[#17181B] ring-1 ring-white/10"><ChevronLeft size={26} /></button>
    <div className="flex min-w-0 justify-center">
      <Image src="/waits-clock-logo.svg" alt="WAITS" width={44} height={28} priority className="pointer-events-none h-7 w-11 shrink-0 object-contain" />
    </div>
    <div className="flex items-center justify-end gap-0 rounded-full bg-[#17181B] p-1 ring-1 ring-white/10">
      <button type="button" aria-label="New Message" onClick={onCompose} className="flex size-11 items-center justify-center rounded-full"><SquarePen size={22} /></button>
      <button type="button" aria-label="Messaging Settings" onClick={onSettings} className="flex size-11 items-center justify-center rounded-full"><Settings size={23} /></button>
    </div>
    <h1 className="col-span-3 text-center text-lg font-black uppercase leading-tight tracking-[0.06em] text-primary">Messages</h1>
  </header>
}

export function MessagingInboxEmpty({ isPremium = true, onUpgrade }: { isPremium?: boolean; onUpgrade?: () => void }) {
  return <div className="flex min-h-52 flex-1 flex-col items-center justify-center px-6 py-12 text-center"><h2 className="text-xl font-bold">No Messages</h2><p className="mt-2 text-sm text-white/55">Start a conversation to see it here.</p>{!isPremium ? <button type="button" onClick={onUpgrade} className="mt-5 min-h-11 rounded-full bg-primary/15 px-5 text-sm font-semibold text-primary">Personal messages with WAITS Pro</button> : null}</div>
}

export function MessagingInboxRow({ conversation, person, onOpen }: { conversation: MessagingInboxItem; person?: User; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className="flex min-h-22 w-full items-center gap-3 border-b border-white/7 py-4 text-left">
    {person ? <Avatar user={person} size={52} /> : <span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><MessageCircle size={23} /></span>}
    <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className="truncate font-semibold">{person?.name ?? 'WAITS User'}</span>{conversation.lastMessageAt ? <time dateTime={conversation.lastMessageAt} className="shrink-0 text-[11px] text-white/40">{relativeMessageTime(new Date(conversation.lastMessageAt).getTime())}</time> : null}</span><span className="mt-1 flex items-center gap-3"><span className={'flex-1 truncate text-sm ' + (conversation.unreadCount > 0 ? 'font-medium text-white/90' : 'text-white/45')}>{conversation.lastMessage || 'Start a conversation'}</span>{conversation.unreadCount > 0 ? <span aria-label={conversation.unreadCount + ' unread messages'} className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold">{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</span> : null}</span></span>
  </button>
}

export function DirectMessageHeader({ recipient, online, onBack }: { recipient: User | null; online: boolean; onBack: () => void }) {
  return <header className="flex shrink-0 items-center gap-3 border-b border-white/7 bg-black px-4 pb-4 pt-[calc(env(safe-area-inset-top)+12px)]">
    <button type="button" onClick={onBack} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#17181B]" aria-label="Back"><ChevronLeft size={21} /></button>
    {recipient ? <Avatar user={recipient} size={40} /> : null}
    <div className="min-w-0 flex-1"><h1 className="truncate text-base font-semibold text-white">{recipient?.name ?? 'Direct Message'}</h1><p className="mt-1 flex items-center gap-1.5 text-xs text-white/45">{online ? <><span className="size-1.5 rounded-full bg-lime" />Active now</> : 'Private conversation'}</p></div>
  </header>
}

export function DirectMessageBubble({ message, mine, onMediaLoad }: { message: { text: string | null; media_path: string | null; created_at: string }; mine: boolean; onMediaLoad?: () => void }) {
  return <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
    <div className={cn('max-w-[82%] rounded-[20px] px-4 py-3 text-[15px] leading-relaxed', mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-[#1C1D21] text-white')}>
      {message.text ? <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.text}</p> : null}
      {message.media_path ? <div onLoad={onMediaLoad}><ChatMedia path={message.media_path} alt="Direct message upload" /></div> : null}
      <p className={cn('mt-1 text-[10px]', mine ? 'text-white/70' : 'text-muted-foreground')}>{relativeMessageTime(new Date(message.created_at).getTime())}</p>
    </div>
  </div>
}

export function DirectMessageComposer({ text, onTextChange, onSend, onAddPhoto, sending, disabled, textareaRef }: { text: string; onTextChange: (text: string) => void; onSend: () => void; onAddPhoto: () => void; sending: boolean; disabled: boolean; textareaRef?: React.Ref<HTMLTextAreaElement> }) {
  return <div className="flex shrink-0 items-end gap-2 border-t border-white/7 bg-black px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
    <button type="button" onClick={onAddPhoto} disabled={disabled || sending} aria-label="Add photo" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary disabled:opacity-40"><ImagePlus size={19} /></button>
    <textarea ref={textareaRef} aria-label="Message" disabled={disabled || sending} rows={1} maxLength={1000} value={text} onChange={(event) => { onTextChange(event.target.value); event.target.style.height = 'auto'; event.target.style.height = Math.min(event.target.scrollHeight, 120) + 'px' }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); onSend() } }} placeholder="Message…" className="max-h-30 min-h-11 min-w-0 flex-1 resize-none rounded-3xl bg-[#1C1D21] px-4 py-3 text-base leading-5 outline-none focus:ring-2 focus:ring-primary disabled:opacity-40" />
    <button type="button" onClick={onSend} disabled={disabled || !text.trim() || sending} aria-label="Send" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground disabled:opacity-40"><Send size={18} /></button>
  </div>
}
