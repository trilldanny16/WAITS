-- Server entitlement regression only. Not a StoreKit purchase test.
-- All generated fixtures and entitlement changes roll back.
begin;
select set_config('test.ent_a',gen_random_uuid()::text,true);
select set_config('test.ent_b',gen_random_uuid()::text,true);
select set_config('test.ent_profile',gen_random_uuid()::text,true);
select set_config('test.ent_event',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
select id::uuid,'entitlement-qa-'||id||'@example.invalid','{}'::jsonb,'{}'::jsonb
from (values(current_setting('test.ent_a')),(current_setting('test.ent_b'))) fixtures(id);
create function pg_temp.assert_ent(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
select pg_temp.assert_ent(public.apply_adapty_entitlement(current_setting('test.ent_a')::uuid,current_setting('test.ent_profile'),'premium',current_setting('test.ent_event'),true),'server grant applied');
select pg_temp.assert_ent((select is_pro from public.profiles where id=current_setting('test.ent_a')::uuid),'grant persisted');
select pg_temp.assert_ent(not public.apply_adapty_entitlement(current_setting('test.ent_a')::uuid,current_setting('test.ent_profile'),'premium',current_setting('test.ent_event'),false),'duplicate event ignored');
select pg_temp.assert_ent((select is_pro from public.profiles where id=current_setting('test.ent_a')::uuid),'duplicate cannot revoke');
do $$ begin
  begin
    perform public.apply_adapty_entitlement(current_setting('test.ent_b')::uuid,current_setting('test.ent_profile'),'premium',gen_random_uuid()::text,true);
    raise exception 'FAIL: provider profile reassigned';
  exception when raise_exception then
    if sqlerrm='FAIL: provider profile reassigned' then raise; end if;
    if sqlerrm not like '%already bound%' then raise; end if;
  end;
end $$;
select pg_temp.assert_ent(public.apply_adapty_entitlement(current_setting('test.ent_a')::uuid,current_setting('test.ent_profile'),'premium',gen_random_uuid()::text,false),'expiry applied');
select pg_temp.assert_ent(not (select is_pro from public.profiles where id=current_setting('test.ent_a')::uuid),'expired access revoked');
select public.apply_stripe_entitlement(current_setting('test.ent_a')::uuid,'qa-customer-'||current_setting('test.ent_a'),'qa-subscription-'||current_setting('test.ent_a'),'active',true,9999999999999);
select public.apply_adapty_entitlement(current_setting('test.ent_a')::uuid,current_setting('test.ent_profile'),'premium',gen_random_uuid()::text,false);
select pg_temp.assert_ent((select is_pro from public.profiles where id=current_setting('test.ent_a')::uuid),'independent active provider preserved');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.ent_b'),true);
do $$ begin
  begin
    perform public.apply_adapty_entitlement(current_setting('test.ent_b')::uuid,gen_random_uuid()::text,'premium',gen_random_uuid()::text,true);
    raise exception 'FAIL: client granted Pro';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
