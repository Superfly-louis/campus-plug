-- Run this in the Supabase SQL editor.
-- An approved shop can list for free. The verified badge stays on only while a
-- Paystack subscription is active, plus a 3-day grace period after the period ends.
-- Paystack ids live in vendor_billing. Clients cannot read or write that table.

alter table public.vendors
  add column if not exists subscription_status text not null default 'inactive';

alter table public.vendors
  add column if not exists verified_until timestamptz;

alter table public.vendors
  drop constraint if exists vendors_subscription_status_known;

alter table public.vendors
  add constraint vendors_subscription_status_known
  check (subscription_status in ('inactive', 'active', 'past_due'));

create table if not exists public.vendor_billing (
  vendor_id uuid primary key,
  customer_code text,
  subscription_code text,
  last_reference text,
  updated_at timestamptz not null default now(),
  constraint vendor_billing_vendor_id_fkey foreign key (vendor_id) references public.vendors (id) on delete cascade,
  constraint vendor_billing_customer_code_length check (
    customer_code is null or char_length(customer_code) between 1 and 80
  ),
  constraint vendor_billing_subscription_code_length check (
    subscription_code is null or char_length(subscription_code) between 1 and 80
  ),
  constraint vendor_billing_last_reference_length check (
    last_reference is null or char_length(last_reference) between 1 and 120
  )
);

alter table public.vendor_billing enable row level security;

revoke all on table public.vendor_billing from public, anon, authenticated;

create or replace function public.protect_vendor_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (select auth.role())
  );
begin
  if v_role = 'service_role' or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.subscription_status := 'inactive';
    new.verified_until := null;
    return new;
  end if;

  new.subscription_status := old.subscription_status;
  new.verified_until := old.verified_until;
  return new;
end;
$fn$;

drop trigger if exists vendors_protect_subscription on public.vendors;

create trigger vendors_protect_subscription
before insert or update on public.vendors
for each row execute function public.protect_vendor_subscription();

revoke all on function public.protect_vendor_subscription() from public, anon, authenticated;
