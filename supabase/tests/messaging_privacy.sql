-- Run after the messaging migration as a database owner, not with service keys
-- in a public client. Every fixture and mutation is rolled back. No real account
-- IDs, emails, friendships or conversations are used.
begin;
select set_config('test.a',gen_random_uuid()::text,true);
select set_config('test.b',gen_random_uuid()::text,true);
select set_config('test.c',gen_random_uuid()::text,true);
select set_config('test.free',gen_random_uuid()::text,true);
select set_config('test.ab',gen_random_uuid()::text,true);
select set_config('test.ac',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
select id::uuid,'messaging-qa-'||id||'@example.invalid','{}'::jsonb,'{}'::jsonb
from (values(current_setting('test.a')),(current_setting('test.b')),
 (current_setting('test.c')),(current_setting('test.free'))) fixtures(id);
update public.profiles set is_pro=true,display_name='Messaging QA Fixture'
where id in(current_setting('test.a')::uuid,current_setting('test.b')::uuid,current_setting('test.c')::uuid);
insert into public.friend_requests(sender_id,receiver_id,status)
values(current_setting('test.b')::uuid,current_setting('test.a')::uuid,'pending');

create function pg_temp.assert_true(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.expect_denied(statement text,label text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when insufficient_privilege then return;
 end;
 raise exception 'FAIL: % unexpectedly succeeded',label;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
insert into public.messaging_preferences(user_id) values(auth.uid());
select pg_temp.assert_true((select who_can_message='friends' and show_when_online from public.messaging_preferences where user_id=auth.uid()),'saved Friends default');
select pg_temp.assert_true(not messaging_private.can_initiate_message(auth.uid(),current_setting('test.b')::uuid),'pending request is not friendship');
select pg_temp.assert_true(not messaging_private.can_initiate_message(auth.uid(),current_setting('test.c')::uuid),'missing preferences defaults Friends');
select pg_temp.expect_denied(format('insert into public.messaging_preferences(user_id,who_can_message) values(%L,''everyone'')',current_setting('test.b')),'cannot create another user preferences');

reset role;
update public.friend_requests set status='accepted' where sender_id=current_setting('test.b')::uuid and receiver_id=current_setting('test.a')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select pg_temp.assert_true(messaging_private.can_initiate_message(auth.uid(),current_setting('test.b')::uuid),'accepted reverse-direction friend');
insert into public.direct_conversations(id,participant_a,participant_b,created_by)
values(current_setting('test.ab')::uuid,least(auth.uid(),current_setting('test.b')::uuid),greatest(auth.uid(),current_setting('test.b')::uuid),auth.uid());
insert into public.direct_messages(conversation_id,sender_id,text) values(current_setting('test.ab')::uuid,auth.uid(),'QA first message');
select pg_temp.assert_true((select started_at is not null from public.direct_conversations where id=current_setting('test.ab')::uuid),'first message stamps durable start');
select pg_temp.expect_denied(format('insert into public.direct_messages(conversation_id,sender_id,text) values(%L,%L,''Spoofed'')',current_setting('test.ab'),current_setting('test.b')),'spoofed sender rejected');

select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
insert into public.messaging_preferences(user_id,who_can_message,show_when_online) values(auth.uid(),'everyone',false);
select pg_temp.assert_true(not exists(select 1 from public.messaging_preferences where user_id=current_setting('test.a')::uuid),'preferences private across accounts');
select pg_temp.assert_true(not exists(select 1 from public.direct_messages where conversation_id=current_setting('test.ab')::uuid),'outsider cannot read messages');
select pg_temp.assert_true(not exists(select 1 from public.get_messaging_inbox() where conversation_id=current_setting('test.ab')::uuid),'outsider inbox isolated');
select pg_temp.expect_denied(format('insert into public.direct_conversation_reads(conversation_id,user_id) values(%L,%L)',current_setting('test.ab'),current_setting('test.c')),'outsider read marker rejected');
update public.messaging_preferences set who_can_message='no_one' where user_id=current_setting('test.a')::uuid;
select pg_temp.assert_true(not exists(select 1 from public.messaging_preferences where user_id=current_setting('test.a')::uuid),'cannot update other account row');

select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select pg_temp.assert_true((select who_can_message='friends' from public.messaging_preferences where user_id=auth.uid()),'foreign update did not change owner setting');
select pg_temp.assert_true(messaging_private.can_initiate_message(auth.uid(),current_setting('test.c')::uuid),'Everyone accepts nonfriend');
select pg_temp.assert_true(exists(select 1 from public.get_messaging_recipients('Messaging QA') where id=current_setting('test.c')::uuid),'recipient RPC includes permitted real profile');
insert into public.direct_conversations(id,participant_a,participant_b,created_by)
values(current_setting('test.ac')::uuid,least(auth.uid(),current_setting('test.c')::uuid),greatest(auth.uid(),current_setting('test.c')::uuid),auth.uid());
select pg_temp.assert_true(exists(select 1 from public.get_messaging_inbox() where conversation_id=current_setting('test.ac')::uuid),'nonfriend conversation retained in inbox');

select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
update public.messaging_preferences set who_can_message='no_one' where user_id=auth.uid();
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select pg_temp.expect_denied(format('insert into public.direct_messages(conversation_id,sender_id,text) values(%L,%L,''Reserved bypass'')',current_setting('test.ac'),current_setting('test.a')),'reserved empty conversation cannot bypass changed privacy');
select pg_temp.assert_true((select started_at is null from public.direct_conversations where id=current_setting('test.ac')::uuid),'denied first message did not mark started');
select pg_temp.assert_true(not messaging_private.can_initiate_message(auth.uid(),current_setting('test.c')::uuid),'No One denies initiation');

select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
update public.messaging_preferences set who_can_message='everyone' where user_id=auth.uid();
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
insert into public.direct_messages(conversation_id,sender_id,text) values(current_setting('test.ac')::uuid,auth.uid(),'Everyone message');
select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
update public.messaging_preferences set who_can_message='no_one' where user_id=auth.uid();
insert into public.direct_messages(conversation_id,sender_id,text) values(current_setting('test.ac')::uuid,auth.uid(),'Existing reply after No One');
select pg_temp.assert_true((select who_can_message='no_one' and not show_when_online from public.messaging_preferences where user_id=auth.uid()),'preferences persist across actor switching');
insert into public.direct_conversation_reads(conversation_id,user_id) values(current_setting('test.ac')::uuid,auth.uid());
select pg_temp.assert_true(exists(select 1 from public.direct_conversation_reads where conversation_id=current_setting('test.ac')::uuid and user_id=auth.uid()),'own read marker persists');

select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
insert into public.messaging_preferences(user_id,show_when_online) values(auth.uid(),true);
insert into public.messaging_presence(user_id) values(auth.uid());
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select pg_temp.assert_true(exists(select 1 from public.messaging_presence where user_id=current_setting('test.b')::uuid),'accepted friend sees permitted presence');
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
update public.messaging_preferences set show_when_online=false where user_id=auth.uid();
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select pg_temp.assert_true(not exists(select 1 from public.messaging_presence where user_id=current_setting('test.b')::uuid),'hidden online presence not leaked');
select pg_temp.expect_denied(format('insert into public.messaging_presence(user_id) values(%L)',current_setting('test.c')),'cannot forge another user presence');

reset role;
insert into public.messaging_preferences(user_id,who_can_message) values(current_setting('test.free')::uuid,'everyone');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select pg_temp.assert_true(not messaging_private.can_initiate_message(auth.uid(),current_setting('test.free')::uuid),'Free recipient does not bypass Pro restriction');
select set_config('request.jwt.claim.sub',current_setting('test.free'),true);
select pg_temp.assert_true(not messaging_private.can_initiate_message(auth.uid(),current_setting('test.c')::uuid),'Free sender does not bypass Pro restriction');

select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
insert into public.user_blocks(blocker_id,blocked_id) values(auth.uid(),current_setting('test.a')::uuid);
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select pg_temp.assert_true(not messaging_private.can_initiate_message(auth.uid(),current_setting('test.b')::uuid),'recipient block rejects initiation');
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
select pg_temp.assert_true(not messaging_private.can_initiate_message(auth.uid(),current_setting('test.a')::uuid),'sender block rejects initiation');
select pg_temp.assert_true(not exists(select 1 from public.get_messaging_inbox() where conversation_id=current_setting('test.ab')::uuid),'blocked conversation unavailable');
select pg_temp.expect_denied(format('insert into public.direct_messages(conversation_id,sender_id,text) values(%L,%L,''Blocked reply'')',current_setting('test.ab'),current_setting('test.b')),'block rejects messages in existing conversation');

select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select pg_temp.assert_true((select unread_count=1 from public.get_messaging_inbox() where conversation_id=current_setting('test.ac')::uuid),'incoming reply is unread');
insert into public.direct_conversation_reads(conversation_id,user_id) values(current_setting('test.ac')::uuid,auth.uid());
select pg_temp.assert_true((select unread_count=0 from public.get_messaging_inbox() where conversation_id=current_setting('test.ac')::uuid),'own read marker clears unread count');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.expect_denied('select * from public.get_messaging_inbox()','anonymous inbox access rejected');
select pg_temp.expect_denied('select * from public.messaging_preferences','anonymous preference access rejected');

reset role;
rollback;
