-- One row per checkout attempt. Clients may read their own rows and cannot write.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  buyer_id uuid references public.profiles (id) on delete set null,
  vendor_user_id uuid references public.profiles (id) on delete set null,
  provider text not null default 'paystack',
  reference text not null,
  access_code text,
  authorization_url text,
  amount_pesewas bigint not null,
  currency text not null default 'GHS',
  status text not null default 'pending',
  commission_percent numeric(5, 2),
  platform_fee_pesewas bigint,
  paystack_fee_pesewas bigint,
  vendor_amount_pesewas bigint,
  channel text,
  needs_refund boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_reference_key unique (reference),
  constraint payments_provider_length check (char_length(provider) between 1 and 40),
  constraint payments_reference_length check (char_length(reference) between 1 and 120),
  constraint payments_access_code_length check (
    access_code is null or char_length(access_code) between 1 and 200
  ),
  constraint payments_authorization_url_length check (
    authorization_url is null or char_length(authorization_url) between 1 and 2000
  ),
  constraint payments_amount_pesewas_positive check (amount_pesewas > 0),
  constraint payments_currency_ghs check (currency = 'GHS'),
  constraint payments_status_known check (
    status in ('pending', 'success', 'failed', 'abandoned', 'refunded')
  ),
  constraint payments_commission_percent_range check (
    commission_percent is null or (commission_percent >= 0 and commission_percent <= 100)
  ),
  constraint payments_platform_fee_nonnegative check (
    platform_fee_pesewas is null or platform_fee_pesewas >= 0
  ),
  constraint payments_paystack_fee_nonnegative check (
    paystack_fee_pesewas is null or paystack_fee_pesewas >= 0
  ),
  constraint payments_vendor_amount_nonnegative check (
    vendor_amount_pesewas is null or vendor_amount_pesewas >= 0
  ),
  constraint payments_channel_length check (
    channel is null or char_length(channel) between 1 and 40
  )
);

alter table public.payments enable row level security;

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create index payments_order_created_idx
  on public.payments (order_id, created_at desc);

create index payments_pending_created_idx
  on public.payments (status, created_at)
  where status = 'pending';

create policy payments_select_party
on public.payments
for select
to authenticated
using (
  buyer_id = (select auth.uid())
  or vendor_user_id = (select auth.uid())
);

revoke insert, update, delete on table public.payments from public, anon, authenticated;

comment on table public.payments is
  'Checkout attempts. Buyer and vendor can read their rows. Only service-role functions write them.';
