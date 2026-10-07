-- RPC functions.
-- Security-definer functions use an empty search_path and schema-qualified names.
-- Prices, role changes, and order totals are computed here, never trusted from the client.
-- enqueue_notification is internal. A later migration sends push and notifies on text messages.

create function public.enqueue_notification(
  user_id uuid,
  type text,
  title text,
  body text,
  data jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := left(btrim(title), 140);
  v_body text := left(btrim(body), 500);
begin
  if user_id is null or v_title = '' or v_body = '' then
    return;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    enqueue_notification.user_id,
    enqueue_notification.type,
    v_title,
    v_body,
    coalesce(enqueue_notification.data, '{}'::jsonb)
  );
end;
$$;

comment on function public.enqueue_notification(uuid, text, text, text, jsonb) is
  'Internal. Inserts a notification for later push delivery. Not granted to clients.';

create function public.admin_review_vendor(
  vendor_id uuid,
  decision text,
  reason text
)
returns public.vendors
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendor public.vendors%rowtype;
  v_reason text := nullif(btrim(reason), '');
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;

  if decision = 'rejected' and v_reason is null then
    raise exception 'a reason is required to reject a vendor';
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'reason is too long';
  end if;

  update public.vendors
  set
    status = decision::public.vendor_status,
    rejection_reason = case when decision = 'approved' then null else v_reason end,
    reviewed_by = (select auth.uid()),
    reviewed_at = pg_catalog.now()
  where id = admin_review_vendor.vendor_id
  returning * into v_vendor;

  if not found then
    raise exception 'vendor not found';
  end if;

  if decision = 'approved' then
    update public.profiles
    set role = 'vendor'::public.user_role
    where id = v_vendor.owner_id;
  end if;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (
    (select auth.uid()),
    'review_vendor',
    'vendor',
    v_vendor.id,
    jsonb_build_object('decision', decision, 'reason', v_reason)
  );

  perform public.enqueue_notification(
    v_vendor.owner_id,
    'vendor_reviewed',
    case when decision = 'approved' then 'Shop approved' else 'Shop not approved' end,
    coalesce(v_reason, 'Your shop application was updated.'),
    jsonb_build_object('vendor_id', v_vendor.id, 'decision', decision)
  );

  return v_vendor;
end;
$$;

create function public.admin_remove_vendor(
  vendor_id uuid,
  reason text
)
returns public.vendors
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendor public.vendors%rowtype;
  v_reason text := nullif(btrim(reason), '');
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  if v_reason is null then
    raise exception 'a reason is required to remove a vendor';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'reason is too long';
  end if;

  update public.vendors
  set
    status = 'removed'::public.vendor_status,
    rejection_reason = v_reason,
    reviewed_by = (select auth.uid()),
    reviewed_at = pg_catalog.now()
  where id = admin_remove_vendor.vendor_id
  returning * into v_vendor;

  if not found then
    raise exception 'vendor not found';
  end if;

  -- Do not demote an admin who also owns a shop.
  update public.profiles
  set role = 'buyer'::public.user_role
  where id = v_vendor.owner_id
    and role = 'vendor'::public.user_role;

  -- Leave removed_by_admin in place so a shop removal does not erase a moderation decision.
  update public.products
  set status = 'hidden'::public.product_status
  where vendor_id = v_vendor.id
    and status is distinct from 'removed_by_admin'::public.product_status;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (
    (select auth.uid()),
    'remove_vendor',
    'vendor',
    v_vendor.id,
    jsonb_build_object('reason', v_reason)
  );

  perform public.enqueue_notification(
    v_vendor.owner_id,
    'vendor_removed',
    'Shop removed',
    v_reason,
    jsonb_build_object('vendor_id', v_vendor.id)
  );

  return v_vendor;
end;
$$;

create function public.admin_moderate_product(
  product_id uuid,
  new_status public.product_status,
  reason text
)
returns public.products
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_owner uuid;
  v_reason text := nullif(btrim(reason), '');
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  if new_status = 'removed_by_admin'::public.product_status and v_reason is null then
    raise exception 'a reason is required to remove a product';
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'reason is too long';
  end if;

  update public.products
  set
    status = new_status,
    moderation_reason = case
      when new_status = 'removed_by_admin'::public.product_status then v_reason
      else null
    end
  where id = admin_moderate_product.product_id
  returning * into v_product;

  if not found then
    raise exception 'product not found';
  end if;

  select owner_id into v_owner
  from public.vendors
  where id = v_product.vendor_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (
    (select auth.uid()),
    'moderate_product',
    'product',
    v_product.id,
    jsonb_build_object('status', new_status, 'reason', v_reason)
  );

  perform public.enqueue_notification(
    v_owner,
    'product_moderated',
    'Product updated',
    coalesce(v_reason, 'A moderator updated your product.'),
    jsonb_build_object(
      'product_id', v_product.id,
      'vendor_id', v_product.vendor_id,
      'status', new_status
    )
  );

  return v_product;
end;
$$;

create function public.get_or_create_conversation(vendor_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_conversation_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select owner_id into v_owner
  from public.vendors
  where id = get_or_create_conversation.vendor_id;

  if not found or not public.vendor_is_public(get_or_create_conversation.vendor_id) then
    raise exception 'vendor is not available';
  end if;

  if v_owner = v_uid then
    raise exception 'you cannot start a conversation with your own shop';
  end if;

  insert into public.conversations (buyer_id, vendor_id, vendor_user_id)
  values (v_uid, get_or_create_conversation.vendor_id, v_owner)
  on conflict (buyer_id, vendor_id) do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select id into v_conversation_id
    from public.conversations
    where buyer_id = v_uid
      and vendor_id = get_or_create_conversation.vendor_id;
  end if;

  return v_conversation_id;
end;
$$;

create function public.place_order(
  vendor_id uuid,
  items jsonb,
  buyer_note text,
  meeting_point text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_shop_name text;
  v_buyer_name text;
  v_note text := nullif(btrim(buyer_note), '');
  v_meeting_point text := nullif(btrim(meeting_point), '');
  v_item record;
  v_product record;
  v_product_ids uuid[] := '{}';
  v_titles text[] := '{}';
  v_prices numeric[] := '{}';
  v_quantities integer[] := '{}';
  v_total numeric := 0;
  v_conversation_id uuid;
  v_order public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'buyer note is too long';
  end if;

  if v_meeting_point is not null and char_length(v_meeting_point) > 200 then
    raise exception 'meeting point is too long';
  end if;

  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) = 0 then
    raise exception 'items must be a non-empty array';
  end if;

  if jsonb_array_length(items) > 50 then
    raise exception 'too many items';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(items) as item
    where jsonb_typeof(item) is distinct from 'object'
      or coalesce(item ->> 'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(item ->> 'quantity', '') !~ '^[0-9]{1,2}$'
  ) then
    raise exception 'each item needs a product_id and a whole-number quantity';
  end if;

  select full_name into v_buyer_name
  from public.profiles
  where id = v_uid;

  if v_buyer_name is null or btrim(v_buyer_name) = '' then
    raise exception 'add your name before placing an order';
  end if;

  select owner_id, shop_name into v_owner, v_shop_name
  from public.vendors
  where id = place_order.vendor_id
  for update;

  if not found or not public.vendor_is_public(place_order.vendor_id) then
    raise exception 'vendor is not available';
  end if;

  if v_owner = v_uid then
    raise exception 'you cannot order from your own shop';
  end if;

  -- Lock products in id order. Prices come from these rows, not from the client.
  for v_item in
    select
      (item ->> 'product_id')::uuid as product_id,
      sum((item ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(items) as item
    group by 1
    order by 1
  loop
    if v_item.quantity < 1 or v_item.quantity > 50 then
      raise exception 'quantity must be from 1 to 50';
    end if;

    select id, title, price, vendor_id, status, is_available
    into v_product
    from public.products
    where id = v_item.product_id
    for update;

    if not found
      or v_product.vendor_id is distinct from place_order.vendor_id
      or v_product.status is distinct from 'active'::public.product_status
      or v_product.is_available is distinct from true
    then
      raise exception 'one or more products are not available';
    end if;

    v_total := v_total + (v_product.price * v_item.quantity);
    v_product_ids := v_product_ids || v_product.id;
    v_titles := v_titles || v_product.title;
    v_prices := v_prices || v_product.price;
    v_quantities := v_quantities || v_item.quantity;
  end loop;

  if v_total > 99999999.99 then
    raise exception 'order total is too large';
  end if;

  v_conversation_id := public.get_or_create_conversation(place_order.vendor_id);

  insert into public.orders (
    buyer_id,
    vendor_id,
    vendor_user_id,
    conversation_id,
    total_amount,
    buyer_note,
    meeting_point,
    buyer_name_snapshot,
    shop_name_snapshot
  ) values (
    v_uid,
    place_order.vendor_id,
    v_owner,
    v_conversation_id,
    v_total,
    v_note,
    v_meeting_point,
    v_buyer_name,
    v_shop_name
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, title_snapshot, unit_price, quantity)
  select v_order.id, line.product_id, line.title, line.unit_price, line.quantity
  from unnest(v_product_ids, v_titles, v_prices, v_quantities)
    as line(product_id, title, unit_price, quantity);

  insert into public.messages (conversation_id, sender_id, type, body, order_id)
  values (
    v_conversation_id,
    v_uid,
    'order'::public.message_type,
    'Order placed for GHS ' || to_char(v_total, 'FM99999990.00'),
    v_order.id
  );

  perform public.enqueue_notification(
    v_owner,
    'order_placed',
    'New order',
    'Order placed for GHS ' || to_char(v_total, 'FM99999990.00'),
    jsonb_build_object(
      'order_id', v_order.id,
      'conversation_id', v_conversation_id,
      'vendor_id', place_order.vendor_id
    )
  );

  return v_order;
end;
$$;

create function public.update_order_status(
  order_id uuid,
  new_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_is_buyer boolean;
  v_is_vendor boolean;
  v_allowed boolean := false;
  v_recipient uuid;
  v_body text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_order
  from public.orders
  where id = update_order_status.order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  v_is_buyer := v_order.buyer_id = v_uid;
  v_is_vendor := v_order.vendor_user_id = v_uid;

  if v_order.buyer_id is distinct from v_uid
    and v_order.vendor_user_id is distinct from v_uid
  then
    raise exception 'order not found';
  end if;

  if v_is_vendor then
    v_allowed :=
      (v_order.status = 'pending'::public.order_status and new_status in ('accepted'::public.order_status, 'rejected'::public.order_status))
      or (v_order.status = 'accepted'::public.order_status and new_status in ('ready'::public.order_status, 'cancelled'::public.order_status))
      or (v_order.status = 'ready'::public.order_status and new_status = 'completed'::public.order_status);
    v_recipient := v_order.buyer_id;
  elsif v_is_buyer then
    v_allowed :=
      v_order.status = 'pending'::public.order_status
      and new_status = 'cancelled'::public.order_status;
    v_recipient := v_order.vendor_user_id;
  end if;

  if not v_allowed then
    raise exception 'that status change is not allowed';
  end if;

  update public.orders
  set status = new_status
  where id = v_order.id
  returning * into v_order;

  v_body := case new_status
    when 'accepted'::public.order_status then 'Order accepted.'
    when 'rejected'::public.order_status then 'Order rejected.'
    when 'ready'::public.order_status then 'Order ready for pickup.'
    when 'completed'::public.order_status then 'Order completed.'
    when 'cancelled'::public.order_status then 'Order cancelled.'
    else 'Order updated.'
  end;

  -- The chat row can already be gone after an account deletion. The order still updates.
  if v_order.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, type, body, order_id)
    values (
      v_order.conversation_id,
      v_uid,
      'system'::public.message_type,
      v_body,
      v_order.id
    );
  end if;

  perform public.enqueue_notification(
    v_recipient,
    'order_status',
    'Order update',
    v_body,
    jsonb_build_object(
      'order_id', v_order.id,
      'conversation_id', v_order.conversation_id,
      'status', new_status
    )
  );

  return v_order;
end;
$$;

create function public.mark_conversation_read(conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.conversations
    where id = mark_conversation_read.conversation_id
      and (buyer_id = v_uid or vendor_user_id = v_uid)
  ) then
    raise exception 'conversation not found';
  end if;

  update public.messages
  set read_at = pg_catalog.now()
  where conversation_id = mark_conversation_read.conversation_id
    and sender_id is distinct from v_uid
    and read_at is null;
end;
$$;

create function public.register_push_token(
  token text,
  platform text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_token text := btrim(token);
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if v_token is null or char_length(v_token) < 1 or char_length(v_token) > 512 then
    raise exception 'token is invalid';
  end if;

  if platform not in ('ios', 'android') then
    raise exception 'platform must be ios or android';
  end if;

  -- The token is unique. A reinstall or account switch moves it to the caller.
  insert into public.push_tokens (user_id, token, platform, is_active, last_seen_at)
  values (v_uid, v_token, platform, true, pg_catalog.now())
  on conflict (token) do update
  set
    user_id = excluded.user_id,
    platform = excluded.platform,
    is_active = true,
    last_seen_at = pg_catalog.now();
end;
$$;

create function public.deactivate_push_token(token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update public.push_tokens
  set is_active = false
  where push_tokens.token = btrim(deactivate_push_token.token)
    and user_id = v_uid;
end;
$$;

-- A composite type, not RETURNS TABLE: category_id is both an argument and a result
-- column, and Postgres rejects that name twice on one function.
create type public.product_search_result as (
  id uuid,
  vendor_id uuid,
  category_id uuid,
  title text,
  description text,
  price numeric,
  is_available boolean,
  status public.product_status,
  created_at timestamptz,
  image_path text,
  shop_name text
);

-- Invoker so products, images, and vendors stay behind the caller's RLS policies.
-- Blank q skips text search. Trigram similarity is the fallback when full text misses.
create function public.search_products(
  q text default null,
  category_id uuid default null,
  min_price numeric default null,
  max_price numeric default null,
  sort text default 'newest',
  "limit" integer default 20,
  "offset" integer default 0
)
returns setof public.product_search_result
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_query text := nullif(btrim(q), '');
  v_sort text := coalesce(nullif(btrim(sort), ''), 'newest');
  v_limit integer := "limit";
  v_offset integer := "offset";
begin
  if v_sort not in ('newest', 'price_asc', 'price_desc', 'relevance') then
    raise exception 'sort must be newest, price_asc, price_desc, or relevance';
  end if;

  if v_limit is null or v_limit < 1 or v_limit > 50 then
    raise exception 'limit must be from 1 to 50';
  end if;

  if v_offset is null or v_offset < 0 then
    raise exception 'offset must be zero or greater';
  end if;

  if min_price is not null and min_price < 0 then
    raise exception 'min_price cannot be negative';
  end if;

  if max_price is not null and max_price < 0 then
    raise exception 'max_price cannot be negative';
  end if;

  if min_price is not null and max_price is not null and min_price > max_price then
    raise exception 'min_price cannot exceed max_price';
  end if;

  return query
  select
    p.id,
    p.vendor_id,
    p.category_id,
    p.title,
    p.description,
    p.price,
    p.is_available,
    p.status,
    p.created_at,
    (
      select images.storage_path
      from public.product_images as images
      where images.product_id = p.id
      order by images.position, images.created_at, images.id
      limit 1
    ) as image_path,
    vendors.shop_name
  from public.products as p
  join public.vendors as vendors on vendors.id = p.vendor_id
  where (
      search_products.category_id is null
      or p.category_id = search_products.category_id
    )
    and (min_price is null or p.price >= min_price)
    and (max_price is null or p.price <= max_price)
    and (
      v_query is null
      or p.search @@ pg_catalog.websearch_to_tsquery('english', v_query)
      or (
        char_length(v_query) >= 3
        and extensions.similarity(p.title, v_query) >= 0.3
      )
    )
  order by
    case
      when v_sort = 'relevance' and v_query is not null then
        pg_catalog.ts_rank(p.search, pg_catalog.websearch_to_tsquery('english', v_query))
    end desc nulls last,
    case when v_sort = 'price_asc' then p.price end asc nulls last,
    case when v_sort = 'price_desc' then p.price end desc nulls last,
    case
      when v_sort = 'relevance' and v_query is not null then extensions.similarity(p.title, v_query)
    end desc nulls last,
    p.created_at desc
  limit v_limit
  offset v_offset;
end;
$$;

comment on function public.search_products(text, uuid, numeric, numeric, text, integer, integer) is
  'Security invoker. Full-text search, then title similarity at 0.3 for queries of 3 or more characters. sort: newest, price_asc, price_desc, relevance.';

revoke all on function public.enqueue_notification(uuid, text, text, text, jsonb) from public, anon, authenticated;

revoke all on function public.admin_review_vendor(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_review_vendor(uuid, text, text) to authenticated;

revoke all on function public.admin_remove_vendor(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_remove_vendor(uuid, text) to authenticated;

revoke all on function public.admin_moderate_product(uuid, public.product_status, text) from public, anon, authenticated;
grant execute on function public.admin_moderate_product(uuid, public.product_status, text) to authenticated;

revoke all on function public.get_or_create_conversation(uuid) from public, anon, authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

revoke all on function public.place_order(uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.place_order(uuid, jsonb, text, text) to authenticated;

revoke all on function public.update_order_status(uuid, public.order_status) from public, anon, authenticated;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;

revoke all on function public.mark_conversation_read(uuid) from public, anon, authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

revoke all on function public.register_push_token(text, text) from public, anon, authenticated;
grant execute on function public.register_push_token(text, text) to authenticated;

revoke all on function public.deactivate_push_token(text) from public, anon, authenticated;
grant execute on function public.deactivate_push_token(text) to authenticated;

revoke all on function public.search_products(text, uuid, numeric, numeric, text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_products(text, uuid, numeric, numeric, text, integer, integer) to authenticated;
