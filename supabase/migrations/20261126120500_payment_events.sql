-- Webhook deduplication. No client access.

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  reference text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  result text,
  payload jsonb not null default '{}'::jsonb,
  constraint payment_events_event_type_length check (char_length(event_type) between 1 and 80),
  constraint payment_events_reference_length check (char_length(reference) between 1 and 120),
  constraint payment_events_result_length check (
    result is null or char_length(result) between 1 and 80
  )
);

create unique index payment_events_type_reference_key
  on public.payment_events (event_type, reference);

alter table public.payment_events enable row level security;

revoke all on table public.payment_events from public, anon, authenticated;

comment on table public.payment_events is
  'One row per Paystack event type and reference. Clients cannot read or write it.';
