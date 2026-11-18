-- Run this in the Supabase SQL editor.
-- place_order names its argument vendor_id, and products.vendor_id is a column.
-- The product lookup uses the bare name, so placing an order fails.

create or replace function public.place_order(
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
#variable_conflict use_column
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

    select products.id, products.title, products.price, products.vendor_id, products.status, products.is_available
    into v_product
    from public.products
    where products.id = v_item.product_id
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
