create index if not exists adapty_webhook_events_user_id_idx
  on public.adapty_webhook_events(user_id);

revoke all on function public.apply_adapty_entitlement(uuid, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.apply_adapty_entitlement(uuid, text, text, text, boolean)
  to service_role;

revoke all on function public.apply_stripe_entitlement(uuid, text, text, text, boolean, bigint)
  from public, anon, authenticated;
grant execute on function public.apply_stripe_entitlement(uuid, text, text, text, boolean, bigint)
  to service_role;

