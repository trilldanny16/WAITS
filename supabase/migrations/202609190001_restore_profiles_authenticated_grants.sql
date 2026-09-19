-- Restore the minimum Data API permissions needed by signed-in users.
-- Row-level security policies still restrict each write to the user's own row.
grant select, insert, update on table public.profiles to authenticated;
