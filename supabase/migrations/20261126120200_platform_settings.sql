-- Server-only settings. Values are JSON numbers: 5, 25, and 30.

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  constraint platform_settings_key_length check (char_length(key) between 1 and 80)
);

alter table public.platform_settings enable row level security;

revoke all on table public.platform_settings from public, anon, authenticated;

create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row execute function public.set_updated_at();

insert into public.platform_settings (key, value)
values
  ('platform_commission_percent', '5'::jsonb),
  ('min_online_order_ghs', '25'::jsonb),
  ('unpaid_order_timeout_minutes', '30'::jsonb)
on conflict (key) do nothing;
