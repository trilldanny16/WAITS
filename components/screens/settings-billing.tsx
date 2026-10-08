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
  Pencil,
  LogOut,
} from 'lucide-react'
import { useNav } from '../navigation'
import { useStore } from '../store'
import { supabase } from '@/lib/supabase-client'

export function SettingsBilling({ onBack, onEditProfile, onSignOut, signingOut = false }: { onBack?: () => void; onEditProfile?: () => void; onSignOut?: () => void; signingOut?: boolean } = {}) {
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
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WAITS_NATIVE_MANAGE_SUBSCRIPTIONS' }))
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
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'WAITS_NATIVE_SIGN_OUT' }))
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
          onClick={onBack ?? back}
          aria-label="Back"
          className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
        >
          <ChevronLeft size={21} />
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-foreground">Settings &amp; Billing</h1>
          <p className="text-xs text-muted-foreground">Membership, policies, and help</p>
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8">
        <AccountSettingsContainer isPremium={isPremium} openingBilling={openingPortal} onBilling={() => void openBilling()} onEditProfile={onEditProfile} onSignOut={onSignOut} signingOut={signingOut} />

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
            <SettingsRow icon={LockKeyhole} title="Account Security" body="Manage your sign-in and account" />
          </div>
        </section>

        <section aria-labelledby="gym-access-heading" className="mt-5 rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-center">
          <h2 id="gym-access-heading" className="text-sm font-extrabold text-destructive">Gym Access</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
            WAITS helps members coordinate workouts at commercial gyms where they already have membership or guest access.
            <strong className="mt-2 block font-extrabold">WAITS does not sell gym memberships or guarantee entry.</strong>
          </p>
        </section>

        <section className="mt-5 rounded-3xl border border-destructive/30 bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <Trash2 size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-card-foreground">Delete Account</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Permanently deletes your profile, workouts, chats, photos, and sign-in. Manage or cancel any App Store or Stripe subscription before deleting.
              </p>
              {!showDelete ? (
                <button type="button" onClick={() => setShowDelete(true)}
                  className="mt-3 rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground">
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
                      className="flex-1 rounded-xl bg-destructive py-2 text-xs font-bold text-destructive-foreground disabled:opacity-40">
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

/** The live screen and design preview share the same unified account surface. */
export function AccountSettingsContainer({ isPremium, openingBilling = false, signingOut = false, onBilling, onEditProfile, onSignOut }: { isPremium: boolean; openingBilling?: boolean; signingOut?: boolean; onBilling: () => void; onEditProfile?: () => void; onSignOut?: () => void }) {
  return <section aria-label="Membership and account" className="mt-4 overflow-hidden rounded-3xl bg-card ring-1 ring-border">
    <div className="p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Crown size={21} /></span>
        <div className="min-w-0"><h2 className="text-base font-extrabold text-card-foreground">{isPremium ? 'WAITS Pro' : 'WAITS Free'}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{isPremium ? 'Your Pro membership is active.' : 'Personal DMs, larger groups, galleries, and stats with Pro.'}</p></div>
      </div>
      <button type="button" onClick={onBilling} disabled={openingBilling} className="mt-3 flex min-h-12 w-full items-center gap-3 rounded-2xl bg-primary px-3 py-3 text-left text-primary-foreground disabled:opacity-60">
        <CreditCard size={19} className="shrink-0" /><span className="flex-1 text-sm font-bold">{openingBilling ? 'Opening billing…' : isPremium ? 'Manage Subscription' : 'View Pro Plans'}</span><ChevronRight size={18} />
      </button>
    </div>
    {onEditProfile ? <button type="button" onClick={onEditProfile} className="flex min-h-14 w-full items-center gap-3 border-t border-border/70 px-4 py-4 text-left text-foreground"><Pencil size={20} className="text-primary" /><span className="flex-1 text-sm font-bold">Edit Profile</span><ChevronRight size={18} className="text-muted-foreground" /></button> : null}
    {onSignOut ? <button type="button" onClick={onSignOut} disabled={signingOut} className="flex min-h-14 w-full items-center gap-3 border-t border-border/70 px-4 py-4 text-left text-destructive disabled:opacity-50"><LogOut size={20} /><span className="text-sm font-bold">{signingOut ? 'Signing Out…' : 'Sign Out'}</span></button> : null}
  </section>
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
