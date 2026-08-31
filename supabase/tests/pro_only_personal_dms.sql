begin;
select set_config('test.free_id', (select id::text from public.profiles where is_pro=false limit 1), true);
select set_config('test.pro_id', (select id::text from public.profiles where is_pro=true limit 1), true);
select set_config('test.dm_id', (select id::text from public.direct_conversations where participant_a in (current_setting('test.free_id')::uuid,current_setting('test.pro_id')::uuid) and participant_b in (current_setting('test.free_id')::uuid,current_setting('test.pro_id')::uuid) limit 1), true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.free_id'),true);
do $$ begin
 if exists(select 1 from public.direct_conversations) then raise exception 'Free can read conversations'; end if;
 if exists(select 1 from public.direct_messages) then raise exception 'Free can read messages'; end if;
 begin
 insert into public.direct_messages(conversation_id,sender_id,text) values(current_setting('test.dm_id')::uuid,auth.uid(),'rollback test');
 raise exception 'Free sent DM';
 exception when insufficient_privilege then null; end;
 begin
 insert into public.community_messages(user_id,text) values(auth.uid(),'rollback test');
 raise exception 'Free posted community';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
-- Temporary entitlement inside this rollback-only test; never committed.
update public.profiles set is_pro=true where id=current_setting('test.free_id')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.pro_id'),true);
do $$ begin
 if not exists(select 1 from public.direct_conversations where id=current_setting('test.dm_id')::uuid) then raise exception 'Pro pair cannot read conversation'; end if;
 insert into public.direct_messages(conversation_id,sender_id,text) values(current_setting('test.dm_id')::uuid,auth.uid(),'rollback Pro message');
 insert into public.community_messages(user_id,text) values(auth.uid(),'rollback Pro community');
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update public.profiles set is_pro=false where id=current_setting('test.free_id')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.free_id'),true);
do $$ begin
 if exists(select 1 from public.direct_messages where conversation_id=current_setting('test.dm_id')::uuid) then raise exception 'Downgraded user reads DM'; end if;
end $$;
rollback;