-- Retain existing subscriptions; enable RLS-filtered messaging updates only.
alter publication supabase_realtime add table public.direct_conversations, public.direct_messages, public.direct_conversation_reads;
