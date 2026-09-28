import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — WAITS',
  description: 'Terms and conditions for using WAITS.',
}

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-6 py-10 text-foreground">
      <Link href="/" className="text-sm font-bold text-primary">← Back to WAITS</Link>
      <h1 className="mt-6 text-3xl font-extrabold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: September 28, 2026</p>

      <div className="mt-8 space-y-7 text-sm leading-6">
        <LegalSection title="Using WAITS">WAITS helps people coordinate workouts and communicate with other members. You must provide accurate account information, keep your account secure, and use the service only for lawful purposes.</LegalSection>
        <LegalSection title="Gym Membership and Access">WAITS is a workout-coordination service for people who already have membership, guest access, or other lawful permission to enter the gym they select. WAITS does not sell gym memberships, provide facility access, or guarantee that a gym will admit any member. You are responsible for confirming your own access and following each facility&apos;s rules.</LegalSection>
        <LegalSection title="Safety">Exercise and meeting other people involve risk. WAITS does not supervise workouts, verify every member, or provide medical advice. Use good judgment, meet in appropriate public locations, and consult a qualified professional before beginning an exercise program.</LegalSection>
        <LegalSection title="Member Content">You are responsible for workouts, messages, profile information, and images you submit. Do not post unlawful, abusive, infringing, deceptive, or unsafe content. You give WAITS permission to host and display your content as needed to operate the service.</LegalSection>
        <LegalSection title="Subscriptions and Billing">On iOS, paid subscriptions are processed by Apple as in-app purchases. Prices and billing intervals are shown before purchase. Subscriptions renew automatically until canceled through your Apple Account subscription settings. Restore Purchases is available in WAITS Settings. Deleting a WAITS account does not automatically cancel an Apple subscription.</LegalSection>
        <LegalSection title="Acceptable Conduct">Do not harass others, impersonate another person, interfere with the service, attempt unauthorized access, scrape member information, or use WAITS to facilitate illegal or dangerous activity.</LegalSection>
        <LegalSection title="Account Suspension or Termination">WAITS may restrict or terminate access when reasonably necessary to protect members, enforce these terms, comply with law, or maintain the service. You may stop using WAITS at any time.</LegalSection>
        <LegalSection title="Service Availability">The service may change, experience interruptions, or contain errors. WAITS is provided on an “as available” basis to the extent permitted by law.</LegalSection>
        <LegalSection title="Limitation of Liability">To the extent permitted by law, WAITS is not responsible for indirect, incidental, or consequential losses, injuries arising from workouts, or conduct between members.</LegalSection>
        <LegalSection title="Changes">These terms may be updated as the service evolves. The current version and effective date will remain available on this page.</LegalSection>
        <LegalSection title="Contact">Questions about these terms can be sent to support@waits.app.</LegalSection>
      </div>
    </main>
  )
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-muted-foreground">{children}</p>
    </section>
  )
}
