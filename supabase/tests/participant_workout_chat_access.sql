begin;
select set_config('test.host_id',(select id::text from public.profiles where is_pro = true order by id limit 1),true);
select set_config('test.member_id',(select id::text from public.profiles where is_pro = false order by id limit 1),true);
select set_config('test.workout_id', gen_random_uuid()::text, true);
select set_config('test.message_id', gen_random_uuid()::text, true);
insert into public.workouts (id,host_id,gym,address,workout_date,workout_time,workout_types,max_participants,visibility)
values (current_setting('test.workout_id')::uuid,current_setting('test.host_id')::uuid,'QA rollback-only','QA rollback-only',current_date+1,'17:00',array['Legs'],3,'public');
insert into public.workout_attendees(workout_id,user_id) values(current_setting('test.workout_id')::uuid,current_setting('test.member_id')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.member_id'),true);
insert into public.crew_messages(id,workout_id,user_id,text) values(current_setting('test.message_id')::uuid,current_setting('test.workout_id')::uuid,auth.uid(),'Rollback-only Free attendee test');
do $$ begin
 if not exists(select 1 from public.crew_messages where id=current_setting('test.message_id')::uuid) then raise exception 'FAIL Free attendee read'; end if;
end $$;
update public.crew_messages set text='Edited rollback test' where id=current_setting('test.message_id')::uuid;
do $$ begin
 if not exists(select 1 from public.crew_messages where id=current_setting('test.message_id')::uuid and text='Edited rollback test') then raise exception 'FAIL Free attendee edit'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.host_id'),true);
do $$ begin
 if not exists(select 1 from public.crew_messages where id=current_setting('test.message_id')::uuid) then raise exception 'FAIL host read'; end if;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if exists(select 1 from public.crew_messages where id=current_setting('test.message_id')::uuid) then raise exception 'FAIL outsider read'; end if;
 begin
  insert into public.crew_messages(workout_id,user_id,text) values(current_setting('test.workout_id')::uuid,auth.uid(),'Must fail');
  raise exception 'FAIL outsider write';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
delete from public.workout_attendees where workout_id=current_setting('test.workout_id')::uuid and user_id=current_setting('test.member_id')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.member_id'),true);
do $$ begin
 if exists(select 1 from public.crew_messages where id=current_setting('test.message_id')::uuid) then raise exception 'FAIL former attendee read'; end if;
end $$;
rollback;