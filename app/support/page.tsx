import Link from 'next/link'

export const metadata = {
  title: 'Support — WAITS',
  description: 'Get help with your WAITS account, workouts, safety, or subscription.',
}

export default function SupportPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-6 py-10 text-foreground">
      <Link href="/" className="text-sm font-bold text-primary">← Back to WAITS</Link>
      <h1 className="mt-6 text-3xl font-extrabold">WAITS Support</h1>
      <p className="mt-2 text-muted-foreground">
        Get help with your account, workouts, safety, or WAITS Pro subscription.
      </p>

      <div className="mt-8 space-y-6">
        <SupportSection title="Contact Support">
          Email <a className="font-bold text-primary" href="mailto:support@waits.app">support@waits.app</a>. Include the email address connected to your WAITS account and a short description of the issue. Never send your password or full payment information.
        </SupportSection>
        <SupportSection title="Subscriptions and Restore Purchases">
          On iPhone, WAITS Pro purchases are billed by Apple. Open Profile, choose Settings, then WAITS Pro to restore purchases. You can manage or cancel an active subscription from your Apple Account subscription settings.
        </SupportSection>
        <SupportSection title="Account and Data Requests">
          You can delete your account from Profile, Settings, Delete Account. For privacy requests, email <a className="font-bold text-primary" href="mailto:privacy@waits.app">privacy@waits.app</a>.
        </SupportSection>
        <SupportSection title="Safety">
          Use the in-app block and report controls for inappropriate behavior or content. If there is an immediate threat or emergency, contact local emergency services.
        </SupportSection>
        <SupportSection title="Gym Access">
          WAITS helps people coordinate workouts. It does not sell gym memberships or provide facility access. Confirm that you have permission to enter a gym before joining a workout there.
        </SupportSection>
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-sm font-bold">
        <Link className="text-primary" href="/privacy">Privacy Policy</Link>
        <Link className="text-primary" href="/terms">Terms of Service</Link>
      </div>
    </main>
  )
}

function SupportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold text-card-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>
    </section>
  )
}
