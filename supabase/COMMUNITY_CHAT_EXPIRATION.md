# Community Chat 24-hour expiration

Run `migrations/202608100001_community_messages_24h.sql` in the Supabase SQL editor first.

If the table was created by an earlier version of this migration, rerun the
migration to add the owner-only UPDATE and DELETE policies. These policies do
not allow edits to another user's messages, and editing does not modify
`created_at`.

## Schedule cleanup

Do not assume `pg_cron` is available. Check it first:

```sql
select name, default_version, installed_version
from pg_available_extensions
where name = 'pg_cron';
```

If it is returned, enable Supabase Cron in **Integrations → Cron** (or run the
following as a database owner), then schedule cleanup once per minute:

```sql
create extension if not exists pg_cron;

select cron.schedule(
  'purge-expired-community-messages',
  '* * * * *',
  $$select public.purge_expired_community_messages();$$
);
```

Confirm the job exists:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'purge-expired-community-messages';
```

The UI and the SELECT policy independently exclude expired rows, so a delayed
cron run cannot reveal them. Realtime DELETE events remove purged rows from open
sessions.

## Immediate expiration test

In the SQL editor, substitute a real test user's UUID:

```sql
insert into public.community_messages (user_id, text)
values ('00000000-0000-0000-0000-000000000000', 'expired test')
returning id, created_at;

-- The insert trigger always supplies a trustworthy server time. SQL-editor
-- database-owner access can backdate only this test row after it is created.
update public.community_messages
set created_at = now() - interval '24 hours 1 minute'
where text = 'expired test';

select public.purge_expired_community_messages();

select * from public.community_messages where text = 'expired test';
```

The test message must never appear in Community Chat, and the final query must
return no row. To watch rolling client expiration, insert a test message and
then update its timestamp to `now() - interval '23 hours 59 minutes'`; it will
disappear after about one minute and the scheduled cleanup will delete it on its
next run.
