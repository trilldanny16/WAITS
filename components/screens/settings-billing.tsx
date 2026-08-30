'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  HelpCircle,
  LockKeyhole,
  ShieldCheck,
  Crown,
  Trash2,
} from 'lucide-react'
import { useNav } from '../navigation'
import { useStore } from '../store'
import { supabase } from '@/lib/supabase-client'

export function SettingsBilling() {
  const { back, openPaywall } = useNav()
  const { isPremium, pushToast } = useStore()
  const [openingPortal, setOpeningPortal] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const openBilling = async () => {
    if (!isPremium) {
      openPaywall('WAITS Pro')
      return
    }
    if (openingPortal) return
    setOpeningPortal(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      pushToast({ title: 'Billing unavailable', body: 'Sign in again to manage your membership.' })
      setOpeningPortal(false)
      return
    }

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json()
      if (!response.ok || !result.url) {
        pushToast({
          title: 'Billing unavailable',
          body: result.error ?? 'Billing settings are temporarily unavailable.',
        })
        setOpeningPortal(false)
        return
      }
      window.location.assign(result.url)
    } catch {
      pushToast({ title: 'Billing unavailable', body: 'Billing settings are temporarily unavailable.' })
      setOpeningPortal(false)
    }
  }

  const deleteAccount = async () => {
    if (deleteText !== 'DELETE' || deleting) return
    setDeleting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      pushToast({ title: 'Sign in again to delete your account.' })
      setDeleting(false)
      return
    }
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Account deletion failed.')
      await supabase.auth.signOut()
      window.location.assign('/')
    } catch (error) {
      pushToast({ title: 'Account not deleted', body: error instanceof Error ? error.message : 'Please try again.' })
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
        >
          <ChevronLeft size={21} />
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-foreground">Settings &amp; Billing</h1>
          <p className="text-xs text-muted-foreground">Membership, policies, and help</p>
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8">
        <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Crown size={22} />
            </span>
            <div>
              <p className="text-sm font-extrabold text-card-foreground">
                {isPremium ? 'WAITS Pro' : 'WAITS Free'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPremium ? 'Your Pro membership is active.' : 'Upgrade for chats, galleries, stats, and more.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void openBilling()}
            disabled={openingPortal}
            className="mt-4 flex w-full items-center justify-between rounded-2xl bg-primary px-4 py-3 text-left text-primary-foreground disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <CreditCard size={19} />
              <span>
                <span className="block text-sm font-bold">{isPremium ? 'Manage Billing' : 'View Pro Plans'}</span>
                <span className="block text-xs opacity-75">
                  {openingPortal ? 'Opening Stripe…' : isPremium ? 'Payment method, invoices, and cancellation' : 'See membership benefits and pricing'}
                </span>
              </span>
            </span>
            <ChevronRight size={18} />
          </button>
        </section>

        <section aria-labelledby="gym-access-heading" className="mt-5 rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <h2 id="gym-access-heading" className="text-sm font-extrabold text-red-600">Gym Access</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
            WAITS helps members coordinate workouts at commercial gyms where they already have membership or guest access.
            <strong className="mt-2 block font-extrabold">WAITS does not sell gym memberships or guarantee entry.</strong>
          </p>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Legal &amp; Privacy
          </h2>
          <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-border">
            <SettingsLink href="/privacy" icon={ShieldCheck} title="Privacy Policy" body="How WAITS collects and protects information" />
            <SettingsLink href="/terms" icon={FileText} title="Terms of Service" body="Rules and conditions for using WAITS" />
          </div>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Help &amp; Account
          </h2>
          <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-border">
            <SettingsLink href="mailto:support@waits.app" icon={HelpCircle} title="Contact Support" body="Questions, billing help, or account requests" />
            <SettingsRow icon={LockKeyhole} title="Account Security" body="Authentication is protected by Supabase" />
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-red-500/30 bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <Trash2 size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-card-foreground">Delete Account</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Permanently deletes your profile, workouts, chats, photos, and sign-in. Manage or cancel any App Store or Stripe subscription before deleting.
              </p>
              {!showDelete ? (
                <button type="button" onClick={() => setShowDelete(true)}
                  className="mt-3 rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white">
                  Delete Account
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <label className="block text-xs font-bold text-card-foreground">
                    Type DELETE to confirm
                    <input value={deleteText} onChange={(event) => setDeleteText(event.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                      autoComplete="off" />
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowDelete(false); setDeleteText('') }}
                      className="flex-1 rounded-xl bg-secondary py-2 text-xs font-bold">Cancel</button>
                    <button type="button" onClick={() => void deleteAccount()}
                      disabled={deleteText !== 'DELETE' || deleting}
                      className="flex-1 rounded-xl bg-red-500 py-2 text-xs font-bold text-white disabled:opacity-40">
                      {deleting ? 'Deleting…' : 'Delete Forever'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground">WAITS · Version 1.0</p>
      </div>
    </div>
  )
}

function SettingsLink({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string
  icon: typeof CreditCard
  title: string
  body: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 border-b border-border px-4 py-4 text-left last:border-b-0"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-card-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{body}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
    </a>
  )
}

function SettingsRow({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof CreditCard
  title: string
  body: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
        <Icon size={19} />
      </span>
      <span>
        <span className="block text-sm font-bold text-card-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{body}</span>
      </span>
    </div>
  )
}
