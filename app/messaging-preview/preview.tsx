'use client'

import { useState } from 'react'
import { DirectMessageComposer, DirectMessageBubble, DirectMessageHeader, MessagingInboxEmpty, MessagingInboxHeader, MessagingInboxRow, MessagingSettings, NewMessage } from '@/components/screens/messaging-panels'
import type { User } from '@/lib/types'

const people: User[] = [
  { id: 'preview-maya', name: 'Maya Chen', username: 'mayatrains', bio: '', city: '', homeGym: '', favoriteSplit: '', hue: 190, isPrivate: false, isVerifiedPro: true },
  { id: 'preview-marcus', name: 'Marcus Reed', username: 'marcusmoves', bio: '', city: '', homeGym: '', favoriteSplit: '', hue: 90, isPrivate: false, isVerifiedPro: true },
]

const preferences = { whoCanMessage: 'friends' as const, showWhenOnline: true }
const inbox = [
  { conversationId: 'preview-conversation-maya', recipientId: people[0].id, lastMessage: 'Leg day at 6? WAIT UP!', lastMessageAt: '2026-10-08T16:05:00Z', unreadCount: 2 },
  { conversationId: 'preview-conversation-marcus', recipientId: people[1].id, lastMessage: 'See you at the gym.', lastMessageAt: '2026-10-08T15:45:00Z', unreadCount: 0 },
]

function ConversationPreview({ onBack, recipient, onAddPhoto }: { onBack: () => void; recipient: User; onAddPhoto: () => void }) {
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([
    { id: 'one', mine: false, text: 'Leg day at 6? WAIT UP!', media_path: null, created_at: '2026-10-08T16:05:00Z' },
    { id: 'two', mine: true, text: 'I’m in. See you there!', media_path: null, created_at: '2026-10-08T16:06:00Z' },
    { id: 'three', mine: false, text: 'Perfect — let’s train together.', media_path: null, created_at: '2026-10-08T16:07:00Z' },
  ])
  return <div className="flex h-full min-h-0 flex-col bg-black text-white">
    <DirectMessageHeader recipient={recipient} online={false} onBack={onBack} />
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-6">{messages.map((message) => <DirectMessageBubble key={message.id} message={message} mine={message.mine} />)}</div>
    <DirectMessageComposer text={text} onTextChange={setText} onSend={() => { if (!text.trim()) return; setMessages((current) => [...current, { id: 'local-' + current.length, mine: true, text: text.trim(), media_path: null, created_at: new Date().toISOString() }]); setText('') }} onAddPhoto={onAddPhoto} sending={false} disabled={false} />
  </div>
}

type PreviewScreen = 'all' | 'inbox' | 'compose' | 'settings' | 'conversation'
const screens = [
  { id: 'inbox', title: 'Messages Inbox' },
  { id: 'compose', title: 'New Message' },
  { id: 'settings', title: 'Messaging Settings' },
  { id: 'conversation', title: 'Conversation' },
] as const

export function MessagingDesignPreview() {
  const [screen, setScreen] = useState<PreviewScreen>('all')
  const [empty, setEmpty] = useState(false)
  const [recipient, setRecipient] = useState(people[0])
  const [notice, setNotice] = useState<string | null>(null)
  return <main className="min-h-dvh bg-black text-white">
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <h1 className="text-xl font-bold">WAITS Messaging Design Preview</h1>
      <p className="mt-2 max-w-3xl text-sm text-white/60">Shared actual messaging panels, headers, inbox rows and message bubbles with fictional local fixtures. The demonstration composer only adds unsaved local messages. This preview does not sign in, send real messages, or save settings. It is not a verified iPhone screenshot or backend test.</p>
      <div className="my-5 flex flex-wrap gap-2">
        <button aria-pressed={screen === 'all'} className="min-h-11 rounded-full bg-white/10 px-5" onClick={() => setScreen('all')}>All four screens</button>
        {screens.map((item) => <button key={item.id} aria-pressed={screen === item.id} className="min-h-11 rounded-full bg-white/10 px-5" onClick={() => { setScreen(item.id); setNotice(null) }}>{item.title}</button>)}
        <button aria-pressed={empty} className="min-h-11 rounded-full bg-white/10 px-5" onClick={() => setEmpty((value) => !value)}>{empty ? 'Show example conversations/friends' : 'Show empty states'}</button>
      </div>
      {notice ? <p role="status" className="mb-4 rounded-xl bg-primary/10 p-3 text-sm">{notice}</p> : null}
      <div className={screen === 'all' ? 'flex gap-5 overflow-x-auto pb-6' : 'flex justify-center'}>
        {screens.filter((item) => screen === 'all' || screen === item.id).map((item) => <section key={item.id} className="w-[min(360px,calc(100vw-32px))] shrink-0">
          <h2 className="mb-3 text-center text-sm font-semibold text-white/60">{item.title}</h2>
          <div className="h-[720px] overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-2xl">
            {item.id === 'inbox' ? <div className="flex h-full min-h-0 flex-col"><MessagingInboxHeader onBack={() => setNotice('Back returns to Home in the app.')} onCompose={() => setScreen('compose')} onSettings={() => setScreen('settings')} /><div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">{empty ? <MessagingInboxEmpty isPremium /> : <ul>{inbox.map((conversation, index) => <MessagingInboxRow key={conversation.conversationId} conversation={conversation} person={people[index]} onOpen={() => { setRecipient(people[index]); setScreen('conversation') }} />)}</ul>}</div></div> : item.id === 'compose' ? <NewMessage key={empty ? 'empty' : 'friends'} previewPeople={empty ? [] : people} busy={false} onBack={() => setScreen('inbox')} onCreate={(id) => { setRecipient(people.find((person) => person.id === id) ?? people[0]); setNotice(`Preview conversation with ${people.find((person) => person.id === id)?.name ?? 'your selected friend'}. No real message was sent.`); setScreen('conversation') }} /> : item.id === 'settings' ? <MessagingSettings previewPreferences={preferences} onBack={() => setScreen('inbox')} /> : <ConversationPreview recipient={recipient} onAddPhoto={() => setNotice('Photo uploads are available in real conversations. The local design preview does not upload files.')} onBack={() => setScreen('inbox')} />}
          </div>
        </section>)}
      </div>
    </div>
  </main>
}
