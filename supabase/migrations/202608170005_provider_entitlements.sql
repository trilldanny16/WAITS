create table if not exists public.subscription_entitlements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'adapty')),
  external_profile_id text,
  external_subscription_id text,
  status text,
  is_active boolean not null default false,
  observed_at_ms bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create unique index if not exists subscription_entitlements_provider_profile_key
  on public.subscription_entitlements(provider, external_profile_id)
  where external_profile_id is not null;

create unique index if not exists subscription_entitlements_provider_subscription_key
  on public.subscription_entitlements(provider, external_subscription_id)
  where external_subscription_id is not null;

alter table public.subscription_entitlements enable row level security;
revoke all on table public.subscription_entitlements from anon, authenticated;

create table if not exists public.adapty_webhook_events (
  event_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  received_at timestamptz not null default now()
);

create index if not exists adapty_webhook_events_user_id_idx
  on public.adapty_webhook_events(user_id);

alter table public.adapty_webhook_events enable row level security;
revoke all on table public.adapty_webhook_events from anon, authenticated;

insert into public.subscription_entitlements (
  user_id,
  provider,
  external_profile_id,
  external_subscription_id,
  status,
  is_active,
  observed_at_ms
)
select
  id,
  'stripe',
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  is_pro,
  stripe_entitlement_observed_at_ms
from public.profiles
where stripe_customer_id is not null
on conflict (user_id, provider) do update set
  external_profile_id = excluded.external_profile_id,
  external_subscription_id = excluded.external_subscription_id,
  status = excluded.status,
  is_active = excluded.is_active,
  observed_at_ms = excluded.observed_at_ms,
  updated_at = now();

create or replace function public.apply_stripe_entitlement(
  target_user_id uuid,
  target_customer_id text,
  target_subscription_id text,
  target_subscription_status text,
  target_is_pro boolean,
  observed_at_ms bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  applied boolean := false;
  affected_rows integer := 0;
begin
  if target_customer_id is null or target_subscription_id is null then
    raise exception 'Stripe customer and subscription IDs are required';
  end if;

  if exists (
    select 1 from public.subscription_entitlements
    where provider = 'stripe'
      and user_id <> target_user_id
      and (
        external_profile_id = target_customer_id
        or external_subscription_id = target_subscription_id
      )
  ) then
    raise exception 'Stripe entitlement is already bound to another profile';
  end if;

  insert into public.subscription_entitlements (
    user_id,
    provider,
    external_profile_id,
    external_subscription_id,
    status,
    is_active,
    observed_at_ms
  ) values (
    target_user_id,
    'stripe',
    target_customer_id,
    target_subscription_id,
    target_subscription_status,
    target_is_pro,
    observed_at_ms
  )
  on conflict (user_id, provider) do update set
    external_profile_id = excluded.external_profile_id,
    external_subscription_id = excluded.external_subscription_id,
    status = excluded.status,
    is_active = excluded.is_active,
    observed_at_ms = excluded.observed_at_ms,
    updated_at = now()
  where excluded.observed_at_ms >= subscription_entitlements.observed_at_ms;

  get diagnostics affected_rows = row_count;
  applied := affected_rows = 1;

  if applied then
    update public.profiles
    set
      is_pro = exists (
        select 1 from public.subscription_entitlements
        where user_id = target_user_id and is_active
      ),
      stripe_customer_id = target_customer_id,
      stripe_subscription_id = target_subscription_id,
      subscription_status = target_subscription_status,
      stripe_entitlement_observed_at_ms = observed_at_ms
    where id = target_user_id;
  end if;

  return applied;
end;
$$;

revoke all on function public.apply_stripe_entitlement(uuid, text, text, text, boolean, bigint) from public, anon, authenticated;
grant execute on function public.apply_stripe_entitlement(uuid, text, text, text, boolean, bigint) to service_role;

create or replace function public.apply_adapty_entitlement(
  target_user_id uuid,
  target_profile_id text,
  target_access_level_id text,
  target_event_id text,
  target_is_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  receipt_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000);
begin
  if target_profile_id is null or target_access_level_id is null or target_event_id is null then
    raise exception 'Adapty profile, access level, and event IDs are required';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Adapty customer_user_id does not match a profile';
  end if;

  if exists (
    select 1 from public.subscription_entitlements
    where provider = 'adapty'
      and user_id <> target_user_id
      and external_profile_id = target_profile_id
  ) then
    raise exception 'Adapty profile is already bound to another profile';
  end if;

  insert into public.adapty_webhook_events(event_id, user_id)
  values (target_event_id, target_user_id)
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  insert into public.subscription_entitlements (
    user_id,
    provider,
    external_profile_id,
    external_subscription_id,
    status,
    is_active,
    observed_at_ms
  ) values (
    target_user_id,
    'adapty',
    target_profile_id,
    target_access_level_id,
    case when target_is_active then 'active' else 'inactive' end,
    target_is_active,
    receipt_ms
  )
  on conflict (user_id, provider) do update set
    external_profile_id = excluded.external_profile_id,
    external_subscription_id = excluded.external_subscription_id,
    status = excluded.status,
    is_active = excluded.is_active,
    observed_at_ms = excluded.observed_at_ms,
    updated_at = now();

  update public.profiles
  set is_pro = exists (
    select 1 from public.subscription_entitlements
    where user_id = target_user_id and is_active
  )
  where id = target_user_id;

  return true;
end;
$$;

revoke all on function public.apply_adapty_entitlement(uuid, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.apply_adapty_entitlement(uuid, text, text, text, boolean) to service_role;

