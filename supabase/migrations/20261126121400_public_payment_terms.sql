-- Buyers and vendors can read the commission percent and the online minimum.
-- The rest of platform_settings stays private.

create or replace function public.get_public_payment_terms()
returns table (
  commission_percent numeric,
  min_online_order_ghs numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select (value #>> '{}')::numeric
      from public.platform_settings
      where key = 'platform_commission_percent'
    ) as commission_percent,
    (
      select (value #>> '{}')::numeric
      from public.platform_settings
      where key = 'min_online_order_ghs'
    ) as min_online_order_ghs;
$$;

revoke all on function public.get_public_payment_terms() from public, anon;
grant execute on function public.get_public_payment_terms() to authenticated;
