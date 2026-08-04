import React from 'react'

export const metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy — WAITS</h1>

      <p className="mb-4">Last updated: August 4, 2026</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Introduction</h2>
        <p>
          WAITS (the "App") respects your privacy. This Privacy Policy explains
          how we collect, use, store, and disclose information when you use the
          App and related services.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Information We Collect</h2>
        <ul className="list-disc ml-6">
          <li>
            <strong>Account and Profile Information:</strong> name, email,
            avatar and other profile fields you provide.
          </li>
          <li>
            <strong>Payment Information:</strong> We integrate with Stripe to
            process payments. Payment information (credit card numbers) is
            handled directly by Stripe and is not stored on our servers.
          </li>
          <li>
            <strong>User-Provided Content:</strong> any content you create in
            the App (workouts, messages, uploaded images).
          </li>
          <li>
            <strong>Usage and Device Data:</strong> logs, analytics, device
            metadata and technical information collected to operate and
            improve the App.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">How We Use Information</h2>
        <ul className="list-disc ml-6">
          <li>To provide and maintain the App's features.</li>
          <li>To process payments and manage subscriptions (via Stripe).</li>
          <li>To respond to support requests and communicate important
            updates.</li>
          <li>To analyze usage, improve the service, and detect abuse.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Third-Party Services</h2>
        <p>
          We use third-party providers to power parts of the App, including but
          not limited to Stripe (payments) and Vercel (hosting). These
          providers have their own privacy practices — please review their
          policies for details.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Data Security</h2>
        <p>
          We implement reasonable technical and organizational measures to
          protect your information. However, no method of transmission over
          the internet is 100% secure.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Your Rights and Choices</h2>
        <p>
          You may access, correct, or delete your account information by
          contacting us. You can also opt out of certain communications.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Children's Privacy</h2>
        <p>
          The App is not directed to children under 13 and we do not knowingly
          collect personal information from children.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Data Retention</h2>
        <p>
          We retain personal data as long as necessary to provide the App and
          fulfill the purposes described in this policy, unless a longer
          retention period is required by law.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p>
          For privacy questions or requests, email us at privacy@waits.app. You
          should replace this address with your preferred contact email.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. We will post changes on
          this page and update the "Last updated" date above.
        </p>
      </section>
    </main>
  )
}
