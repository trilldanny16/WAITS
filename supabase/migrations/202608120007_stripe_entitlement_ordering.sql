alter table public.profiles
  add column if not exists stripe_entitlement_observed_at_ms bigint not null default 0;

create or replace function public.protect_profile_entitlement_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.is_pro := old.is_pro;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.subscription_status := old.subscription_status;
    new.stripe_entitlement_observed_at_ms := old.stripe_entitlement_observed_at_ms;
  end if;
  return new;
end;
$$;

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
  updated_count integer;
begin
  if target_customer_id is null or target_subscription_id is null then
    raise exception 'Stripe customer and subscription IDs are required';
  end if;

  if exists (
    select 1 from public.profiles
    where id <> target_user_id
      and (
        stripe_customer_id = target_customer_id
        or stripe_subscription_id = target_subscription_id
      )
  ) then
    raise exception 'Stripe entitlement is already bound to another profile';
  end if;

  update public.profiles
  set
    is_pro = target_is_pro,
    stripe_customer_id = target_customer_id,
    stripe_subscription_id = target_subscription_id,
    subscription_status = target_subscription_status,
    stripe_entitlement_observed_at_ms = observed_at_ms
  where id = target_user_id
    and observed_at_ms >= stripe_entitlement_observed_at_ms;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.apply_stripe_entitlement(uuid, text, text, text, boolean, bigint) from public;
grant execute on function public.apply_stripe_entitlement(uuid, text, text, text, boolean, bigint) to service_role;
