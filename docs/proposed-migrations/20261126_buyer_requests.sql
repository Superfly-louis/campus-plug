-- Run this in the Supabase SQL editor.
-- A buyer posts what they need. People on the same campus can read open posts.
-- An approved shop on that campus can offer, which opens the existing chat.
-- Naming a shop only notifies that shop. The post stays on the board.

create table public.buyer_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  buyer_name text not null,
  campus text not null,
  category_id uuid not null,
  title text not null,
  body text,
  target_vendor_id uuid,
  status text not null default 'open',
  removal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buyer_requests_buyer_id_fkey foreign key (buyer_id) references public.profiles (id) on delete cascade,
  constraint buyer_requests_category_id_fkey foreign key (category_id) references public.categories (id),
  constraint buyer_requests_target_vendor_id_fkey foreign key (target_vendor_id) references public.vendors (id) on delete set null,
  constraint buyer_requests_buyer_name_length check (char_length(buyer_name) between 1 and 80),
  constraint buyer_requests_campus_known check (
    campus in ('Miotso (Main campus)', 'Accra (City campus)', 'Kumasi Campus')
  ),
  constraint buyer_requests_title_length check (char_length(title) between 2 and 80),
  constraint buyer_requests_body_length check (body is null or char_length(body) between 1 and 300),
  constraint buyer_requests_status_known check (status in ('open', 'closed', 'removed')),
  constraint buyer_requests_removal_reason_length check (
    removal_reason is null or char_length(removal_reason) between 1 and 500
  )
);

create index buyer_requests_campus_open_idx
  on public.buyer_requests (campus, created_at desc)
  where status = 'open';

create index buyer_requests_buyer_created_idx
  on public.buyer_requests (buyer_id, created_at desc);

create table public.request_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  vendor_id uuid not null,
  vendor_user_id uuid not null,
  note text not null,
  conversation_id uuid not null,
  created_at timestamptz not null default now(),
  constraint request_offers_request_id_fkey foreign key (request_id) references public.buyer_requests (id) on delete cascade,
  constraint request_offers_vendor_id_fkey foreign key (vendor_id) references public.vendors (id) on delete cascade,
  constraint request_offers_vendor_user_id_fkey foreign key (vendor_user_id) references public.profiles (id) on delete cascade,
  constraint request_offers_conversation_id_fkey foreign key (conversation_id) references public.conversations (id) on delete cascade,
  constraint request_offers_request_vendor_key unique (request_id, vendor_id),
  constraint request_offers_note_length check (char_length(note) between 1 and 300)
);

create index request_offers_request_idx
  on public.request_offers (request_id, created_at desc);

alter table public.buyer_requests enable row level security;
alter table public.request_offers enable row level security;

revoke all on table public.buyer_requests from public, anon, authenticated;
revoke all on table public.request_offers from public, anon, authenticated;

create trigger buyer_requests_set_updated_at
before update on public.buyer_requests
for each row execute function public.set_updated_at();

-- Internal. Not granted to clients. Public RPCs below apply the visibility rules.
create or replace function public.buyer_request_feed(
  request_id uuid,
  only_buyer boolean,
  campus_name text,
  category_id uuid,
  open_only boolean
)
returns table (
  id uuid,
  buyer_id uuid,
  buyer_name text,
  campus text,
  category_id uuid,
  category_name text,
  category_slug text,
  title text,
  body text,
  target_vendor_id uuid,
  target_shop_name text,
  status text,
  offer_count bigint,
  mine boolean,
  offered boolean,
  created_at timestamptz,
  removal_reason text
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    r.id,
    r.buyer_id,
    r.buyer_name,
    r.campus,
    r.category_id,
    coalesce(c.name, ''),
    coalesce(c.slug, ''),
    r.title,
    r.body,
    r.target_vendor_id,
    tv.shop_name,
    r.status,
    (select count(*) from public.request_offers as o where o.request_id = r.id),
    (r.buyer_id = (select auth.uid())),
    exists (
      select 1
      from public.request_offers as o
      join public.vendors as v on v.id = o.vendor_id
      where o.request_id = r.id
        and v.owner_id = (select auth.uid())
    ),
    r.created_at,
    case
      when r.buyer_id = (select auth.uid()) or (select public.is_admin()) then r.removal_reason
      else null
    end
  from public.buyer_requests as r
  left join public.categories as c on c.id = r.category_id
  left join public.vendors as tv on tv.id = r.target_vendor_id
  where (buyer_request_feed.request_id is null or r.id = buyer_request_feed.request_id)
    and (not buyer_request_feed.only_buyer or r.buyer_id = (select auth.uid()))
    and (buyer_request_feed.campus_name is null or r.campus = buyer_request_feed.campus_name)
    and (buyer_request_feed.category_id is null or r.category_id = buyer_request_feed.category_id)
    and (
      not buyer_request_feed.open_only
      or (
        r.status = 'open'
        and r.created_at > pg_catalog.now() - interval '14 days'
      )
    )
  order by r.created_at desc
  limit 100;
$fn$;

revoke all on function public.buyer_request_feed(uuid, boolean, text, uuid, boolean) from public, anon, authenticated;

create or replace function public.create_buyer_request(
  title text,
  category_id uuid,
  body text default null,
  vendor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_title text := btrim(coalesce(create_buyer_request.title, ''));
  v_body text := nullif(btrim(coalesce(create_buyer_request.body, '')), '');
  v_name text;
  v_campus text;
  v_owner uuid;
  v_shop_campus text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if char_length(v_title) < 2 then
    raise exception 'say what you need';
  end if;

  if char_length(v_title) > 80 then
    raise exception 'title is too long';
  end if;

  if v_body is not null and char_length(v_body) > 300 then
    raise exception 'request note is too long';
  end if;

  if create_buyer_request.category_id is null or not exists (
    select 1 from public.categories where id = create_buyer_request.category_id
  ) then
    raise exception 'choose a category';
  end if;

  select btrim(full_name), campus_location
  into v_name, v_campus
  from public.profiles
  where id = v_uid;

  if v_name is null or v_name = '' then
    raise exception 'add your name before posting a request';
  end if;

  if v_campus is null or v_campus not in (
    'Miotso (Main campus)',
    'Accra (City campus)',
    'Kumasi Campus'
  ) then
    raise exception 'add your campus before posting a request';
  end if;

  if (
    select count(*)
    from public.buyer_requests
    where buyer_id = v_uid
      and status = 'open'
  ) >= 3 then
    raise exception 'you already have 3 open requests';
  end if;

  if create_buyer_request.vendor_id is not null then
    select owner_id into v_owner
    from public.vendors
    where id = create_buyer_request.vendor_id;

    if v_owner is null or not public.vendor_is_public(create_buyer_request.vendor_id) then
      raise exception 'vendor is not available';
    end if;

    if v_owner = v_uid then
      raise exception 'you cannot request from your own shop';
    end if;

    select campus_location into v_shop_campus
    from public.profiles
    where id = v_owner;

    if v_shop_campus is distinct from v_campus then
      raise exception 'that shop is not on your campus';
    end if;
  end if;

  insert into public.buyer_requests (
    buyer_id,
    buyer_name,
    campus,
    category_id,
    title,
    body,
    target_vendor_id
  )
  values (
    v_uid,
    v_name,
    v_campus,
    create_buyer_request.category_id,
    v_title,
    v_body,
    create_buyer_request.vendor_id
  )
  returning id into v_id;

  if v_owner is not null then
    perform public.enqueue_notification(
      v_owner,
      'buyer_request',
      'New request',
      v_title,
      jsonb_build_object('request_id', v_id)
    );
  end if;

  return v_id;
end;
$fn$;

create or replace function public.close_buyer_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_buyer uuid;
  v_status text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update public.buyer_requests
  set status = 'closed'
  where id = close_buyer_request.request_id
    and buyer_id = v_uid
    and status = 'open';

  if found then
    return;
  end if;

  select buyer_id, status
  into v_buyer, v_status
  from public.buyer_requests
  where id = close_buyer_request.request_id;

  if v_buyer is null then
    raise exception 'request not found';
  end if;

  if v_buyer is distinct from v_uid then
    raise exception 'only the buyer can close this request';
  end if;

  if v_status = 'removed' then
    raise exception 'this request was already removed';
  end if;

  raise exception 'this request is already closed';
end;
$fn$;

create or replace function public.list_my_requests()
returns table (
  id uuid,
  buyer_id uuid,
  buyer_name text,
  campus text,
  category_id uuid,
  category_name text,
  category_slug text,
  title text,
  body text,
  target_vendor_id uuid,
  target_shop_name text,
  status text,
  offer_count bigint,
  mine boolean,
  offered boolean,
  created_at timestamptz,
  removal_reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  return query
  select *
  from public.buyer_request_feed(null, true, null, null, false);
end;
$fn$;

create or replace function public.list_campus_requests(filter_category_id uuid default null)
returns table (
  id uuid,
  buyer_id uuid,
  buyer_name text,
  campus text,
  category_id uuid,
  category_name text,
  category_slug text,
  title text,
  body text,
  target_vendor_id uuid,
  target_shop_name text,
  status text,
  offer_count bigint,
  mine boolean,
  offered boolean,
  created_at timestamptz,
  removal_reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_campus text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select campus_location into v_campus
  from public.profiles
  where profiles.id = v_uid;

  if v_campus is null or btrim(v_campus) = '' then
    return;
  end if;

  return query
  select *
  from public.buyer_request_feed(
    null,
    false,
    v_campus,
    list_campus_requests.filter_category_id,
    true
  );
end;
$fn$;

create or replace function public.list_campus_shops()
returns table (
  id uuid,
  shop_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_campus text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select campus_location into v_campus
  from public.profiles
  where profiles.id = v_uid;

  if v_campus is null or btrim(v_campus) = '' then
    return;
  end if;

  return query
  select v.id, v.shop_name
  from public.vendors as v
  join public.profiles as p on p.id = v.owner_id
  where v.status = 'approved'::public.vendor_status
    and v.is_paused = false
    and p.campus_location = v_campus
    and v.owner_id is distinct from v_uid
  order by v.shop_name;
end;
$fn$;

create or replace function public.get_buyer_request(request_id uuid)
returns table (
  id uuid,
  buyer_id uuid,
  buyer_name text,
  campus text,
  category_id uuid,
  category_name text,
  category_slug text,
  title text,
  body text,
  target_vendor_id uuid,
  target_shop_name text,
  status text,
  offer_count bigint,
  mine boolean,
  offered boolean,
  created_at timestamptz,
  removal_reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_request public.buyer_requests%rowtype;
  v_campus text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_request
  from public.buyer_requests
  where buyer_requests.id = get_buyer_request.request_id;

  if not found then
    raise exception 'request not found';
  end if;

  select campus_location into v_campus
  from public.profiles
  where profiles.id = v_uid;

  if not (
    v_request.buyer_id = v_uid
    or (select public.is_admin())
    or (
      v_request.status = 'open'
      and v_request.campus = v_campus
      and v_request.created_at > pg_catalog.now() - interval '14 days'
    )
  ) then
    raise exception 'request not found';
  end if;

  return query
  select *
  from public.buyer_request_feed(v_request.id, false, null, null, false);
end;
$fn$;

create or replace function public.list_request_offers(request_id uuid)
returns table (
  id uuid,
  vendor_id uuid,
  shop_name text,
  note text,
  conversation_id uuid,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_buyer uuid;
  v_vendor uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select buyer_id into v_buyer
  from public.buyer_requests
  where buyer_requests.id = list_request_offers.request_id;

  if v_buyer is null then
    return;
  end if;

  select vendors.id into v_vendor
  from public.vendors
  where owner_id = v_uid;

  if v_buyer is distinct from v_uid and not (select public.is_admin()) then
    return query
    select o.id, o.vendor_id, v.shop_name, o.note, o.conversation_id, o.created_at
    from public.request_offers as o
    join public.vendors as v on v.id = o.vendor_id
    where o.request_id = list_request_offers.request_id
      and o.vendor_id = v_vendor
    order by o.created_at desc;
    return;
  end if;

  return query
  select o.id, o.vendor_id, v.shop_name, o.note, o.conversation_id, o.created_at
  from public.request_offers as o
  join public.vendors as v on v.id = o.vendor_id
  where o.request_id = list_request_offers.request_id
  order by o.created_at desc;
end;
$fn$;

create or replace function public.offer_on_request(request_id uuid, note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_note text := nullif(btrim(coalesce(offer_on_request.note, '')), '');
  v_request public.buyer_requests%rowtype;
  v_vendor_id uuid;
  v_campus text;
  v_conversation_id uuid;
  v_body text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if v_note is null then
    raise exception 'tell the buyer how you can help';
  end if;

  if char_length(v_note) > 300 then
    raise exception 'offer note is too long';
  end if;

  select * into v_request
  from public.buyer_requests
  where id = offer_on_request.request_id;

  if not found then
    raise exception 'request not found';
  end if;

  if v_request.status is distinct from 'open' then
    raise exception 'this request is no longer open';
  end if;

  if v_request.created_at < pg_catalog.now() - interval '14 days' then
    raise exception 'this request is no longer open';
  end if;

  if v_request.buyer_id = v_uid then
    raise exception 'you cannot offer on your own request';
  end if;

  select v.id, p.campus_location
  into v_vendor_id, v_campus
  from public.vendors as v
  join public.profiles as p on p.id = v.owner_id
  where v.owner_id = v_uid;

  if v_vendor_id is null or not public.vendor_is_public(v_vendor_id) then
    raise exception 'you need an approved shop to offer';
  end if;

  if v_campus is distinct from v_request.campus then
    raise exception 'that shop is not on your campus';
  end if;

  if exists (
    select 1
    from public.request_offers
    where request_offers.request_id = v_request.id
      and request_offers.vendor_id = v_vendor_id
  ) then
    raise exception 'you already offered on this request';
  end if;

  insert into public.conversations (buyer_id, vendor_id, vendor_user_id)
  values (v_request.buyer_id, v_vendor_id, v_uid)
  on conflict on constraint conversations_buyer_vendor_key do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select conversations.id into v_conversation_id
    from public.conversations
    where conversations.buyer_id = v_request.buyer_id
      and conversations.vendor_id = v_vendor_id;
  end if;

  if v_conversation_id is null then
    raise exception 'could not open conversation';
  end if;

  v_body := 'About your request "' || v_request.title || '": ' || v_note;

  begin
    insert into public.request_offers (request_id, vendor_id, vendor_user_id, note, conversation_id)
    values (v_request.id, v_vendor_id, v_uid, v_note, v_conversation_id);
  exception
    when unique_violation then
      raise exception 'you already offered on this request';
  end;

  insert into public.messages (conversation_id, sender_id, type, body)
  values (v_conversation_id, v_uid, 'text'::public.message_type, v_body);

  return v_conversation_id;
end;
$fn$;

create or replace function public.admin_remove_request(request_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_reason text := nullif(btrim(coalesce(admin_remove_request.reason, '')), '');
  v_request public.buyer_requests%rowtype;
begin
  if not (select public.is_admin()) then
    raise exception 'admin only';
  end if;

  if v_reason is null then
    raise exception 'a reason is required to remove a request';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'reason is too long';
  end if;

  select * into v_request
  from public.buyer_requests
  where id = admin_remove_request.request_id;

  if not found then
    raise exception 'request not found';
  end if;

  if v_request.status = 'removed' then
    raise exception 'this request was already removed';
  end if;

  update public.buyer_requests
  set status = 'removed', removal_reason = v_reason
  where id = v_request.id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (
    (select auth.uid()),
    'remove_request',
    'buyer_request',
    v_request.id,
    jsonb_build_object('reason', v_reason)
  );

  perform public.enqueue_notification(
    v_request.buyer_id,
    'request_removed',
    'Request removed',
    v_reason,
    jsonb_build_object('request_id', v_request.id)
  );
end;
$fn$;

revoke all on function public.create_buyer_request(text, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.create_buyer_request(text, uuid, text, uuid) to authenticated;

revoke all on function public.close_buyer_request(uuid) from public, anon, authenticated;
grant execute on function public.close_buyer_request(uuid) to authenticated;

revoke all on function public.list_my_requests() from public, anon, authenticated;
grant execute on function public.list_my_requests() to authenticated;

revoke all on function public.list_campus_requests(uuid) from public, anon, authenticated;
grant execute on function public.list_campus_requests(uuid) to authenticated;

revoke all on function public.list_campus_shops() from public, anon, authenticated;
grant execute on function public.list_campus_shops() to authenticated;

revoke all on function public.get_buyer_request(uuid) from public, anon, authenticated;
grant execute on function public.get_buyer_request(uuid) to authenticated;

revoke all on function public.list_request_offers(uuid) from public, anon, authenticated;
grant execute on function public.list_request_offers(uuid) to authenticated;

revoke all on function public.offer_on_request(uuid, text) from public, anon, authenticated;
grant execute on function public.offer_on_request(uuid, text) to authenticated;

revoke all on function public.admin_remove_request(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_remove_request(uuid, text) to authenticated;
