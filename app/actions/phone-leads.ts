'use server'

import { db } from '@/lib/db'
import { phoneLeads } from '@/lib/db/schema'

export type SavePhoneResult = { ok: true } | { ok: false; error: string }

export async function savePhoneLead(rawPhone: string): Promise<SavePhoneResult> {
  const phone = (rawPhone ?? '').trim()

  // Keep only digits to validate length (allows +, spaces, dashes, parens in input).
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) {
    return { ok: false, error: 'Please enter a valid phone number.' }
  }

  try {
    await db.insert(phoneLeads).values({ phone })
    return { ok: true }
  } catch (err) {
    console.log('[v0] savePhoneLead error:', err instanceof Error ? err.message : err)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}
