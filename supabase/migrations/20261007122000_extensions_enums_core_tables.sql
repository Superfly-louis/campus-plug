-- Campus Plug core schema.
-- MVP text limits live on the columns as CHECK constraints.
-- Orders survive account deletion: their user FKs are ON DELETE SET NULL and the
-- name snapshots stay. See supabase/README.md.

create schema if not exists extensions;

create extension if not exists pg_trgm with schema extensions;
create extension if not exists pg_net with schema extensions;
-- pg_cron is not relocatable into extensions; Supabase installs it in pg_catalog.
create extension if not exists pg_cron with schema pg_catalog;

create type public.user_role as enum ('buyer', 'vendor', 'admin');
create type public.vendor_status as enum ('pending', 'approved', 'rejected', 'removed');
create type public.product_status as enum ('active', 'hidden', 'removed_by_admin');
create type public.order_status as enum (
  'pending',
  'accepted',
  'ready',
  'completed',
  'rejected',
  'cancelled'
);
create type public.payment_method as enum ('cash_on_delivery', 'mobile_money', 'card');
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');
create type public.message_type as enum ('text', 'order', 'system');
create type public.push_status as enum ('pending', 'sent', 'failed', 'skipped');

-- id matches auth.users so deleting the auth user cascades here.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  campus_location text,
  role public.user_role not null default 'buyer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (
    full_name is null or char_length(full_name) between 1 and 80
  ),
  constraint profiles_phone_length check (
    phone is null or char_length(phone) between 7 and 20
  ),
  constraint profiles_avatar_url_length check (
    avatar_url is null or char_length(avatar_url) between 1 and 500
  ),
  constraint profiles_campus_location_length check (
    campus_location is null or char_length(campus_location) between 1 and 120
  )
);

alter table public.profiles enable row level security;

comment on table public.profiles is
  'One row per auth user. full_name may be null until the signup trigger or the user sets it.';

-- One shop per user. owner_id is unique.
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  shop_name text not null,
  description text,
  logo_url text,
  status public.vendor_status not null default 'pending',
  is_paused boolean not null default false,
  rejection_reason text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_shop_name_length check (char_length(shop_name) between 1 and 80),
  constraint vendors_description_length check (
    description is null or char_length(description) between 1 and 1000
  ),
  constraint vendors_logo_url_length check (
    logo_url is null or char_length(logo_url) between 1 and 500
  ),
  constraint vendors_rejection_reason_length check (
    rejection_reason is null or char_length(rejection_reason) between 1 and 500
  )
);

alter table public.vendors enable row level security;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_length check (char_length(name) between 1 and 80),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_slug_length check (char_length(slug) between 1 and 80),
  constraint categories_sort_order_nonnegative check (sort_order >= 0)
);

alter table public.categories enable row level security;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  title text not null,
  description text,
  price numeric(10, 2) not null,
  is_available boolean not null default true,
  status public.product_status not null default 'active',
  moderation_reason text,
  -- Maintained by Postgres from title + description. Indexed in a later migration.
  search tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_title_length check (char_length(title) between 1 and 120),
  constraint products_description_length check (
    description is null or char_length(description) between 1 and 2000
  ),
  constraint products_price_nonnegative check (price >= 0),
  constraint products_moderation_reason_length check (
    moderation_reason is null or char_length(moderation_reason) between 1 and 500
  )
);

alter table public.products enable row level security;

comment on column public.products.search is
  'Stored generated tsvector of title and description for full-text search.';

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_images_storage_path_length check (char_length(storage_path) between 1 and 500),
  constraint product_images_position_nonnegative check (position >= 0)
);

alter table public.product_images enable row level security;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  -- Copy of vendors.owner_id so participant checks do not join vendors.
  vendor_user_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_buyer_vendor_key unique (buyer_id, vendor_id),
  constraint conversations_not_self check (buyer_id <> vendor_user_id)
);

alter table public.conversations enable row level security;

comment on column public.conversations.vendor_user_id is
  'Denormalised vendors.owner_id. RPCs must set this to that owner.';

-- Created before messages so messages.order_id can reference orders.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.profiles (id) on delete set null,
  vendor_id uuid references public.vendors (id) on delete set null,
  vendor_user_id uuid references public.profiles (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null default 'cash_on_delivery',
  payment_status public.payment_status not null default 'unpaid',
  -- Reserved for Paystack in v2. Unused while payment is cash on delivery.
  payment_provider text,
  payment_reference text,
  total_amount numeric(10, 2) not null,
  buyer_note text,
  meeting_point text,
  buyer_name_snapshot text not null,
  shop_name_snapshot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_amount_nonnegative check (total_amount >= 0),
  constraint orders_buyer_note_length check (
    buyer_note is null or char_length(buyer_note) between 1 and 500
  ),
  constraint orders_meeting_point_length check (
    meeting_point is null or char_length(meeting_point) between 1 and 200
  ),
  constraint orders_buyer_name_snapshot_length check (
    char_length(buyer_name_snapshot) between 1 and 80
  ),
  constraint orders_shop_name_snapshot_length check (
    char_length(shop_name_snapshot) between 1 and 80
  ),
  constraint orders_payment_provider_length check (
    payment_provider is null or char_length(payment_provider) between 1 and 40
  ),
  constraint orders_payment_reference_length check (
    payment_reference is null or char_length(payment_reference) between 1 and 120
  )
);

alter table public.orders enable row level security;

comment on table public.orders is
  'Survives account deletion. User FKs null out; buyer_name_snapshot and shop_name_snapshot remain.';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  type public.message_type not null default 'text',
  body text not null,
  order_id uuid references public.orders (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_body_length check (char_length(body) between 1 and 2000)
);

alter table public.messages enable row level security;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  title_snapshot text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_title_snapshot_length check (char_length(title_snapshot) between 1 and 120),
  constraint order_items_unit_price_nonnegative check (unit_price >= 0),
  constraint order_items_quantity_positive check (quantity > 0)
);

alter table public.order_items enable row level security;

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text not null,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_tokens_token_length check (char_length(token) between 1 and 512),
  constraint push_tokens_platform_check check (platform in ('ios', 'android'))
);

alter table public.push_tokens enable row level security;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  push_status public.push_status not null default 'pending',
  push_attempts integer not null default 0,
  push_last_error text,
  next_attempt_at timestamptz not null default now(),
  push_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_type_length check (char_length(type) between 1 and 64),
  constraint notifications_title_length check (char_length(title) between 1 and 140),
  constraint notifications_body_length check (char_length(body) between 1 and 500),
  constraint notifications_push_attempts_nonnegative check (push_attempts >= 0),
  constraint notifications_push_last_error_length check (
    push_last_error is null or char_length(push_last_error) between 1 and 500
  )
);

alter table public.notifications enable row level security;

-- No updated_at. Rows are inserted and never changed.
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_log_action_length check (char_length(action) between 1 and 80),
  constraint admin_audit_log_target_type_length check (char_length(target_type) between 1 and 80)
);

alter table public.admin_audit_log enable row level security;

create function public.reject_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'admin_audit_log is append-only';
end;
$$;

create trigger admin_audit_log_append_only
before update or delete on public.admin_audit_log
for each row
execute function public.reject_audit_log_mutation();

revoke all on function public.reject_audit_log_mutation() from public, anon, authenticated;

comment on table public.admin_audit_log is
  'Append-only. Updates and deletes raise via reject_audit_log_mutation.';

-- No updated_at. processed_at null means the Storage API delete has not run yet.
create table public.storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  attempts integer not null default 0,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint storage_cleanup_queue_bucket_length check (char_length(bucket) between 1 and 80),
  constraint storage_cleanup_queue_path_length check (char_length(path) between 1 and 500),
  constraint storage_cleanup_queue_attempts_nonnegative check (attempts >= 0)
);

alter table public.storage_cleanup_queue enable row level security;

comment on table public.storage_cleanup_queue is
  'Paths whose storage.objects row is gone but whose file still needs a Storage API delete.';
