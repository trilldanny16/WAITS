import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const phoneLeads = pgTable('phone_leads', {
  id: serial('id').primaryKey(),
  phone: text('phone').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
