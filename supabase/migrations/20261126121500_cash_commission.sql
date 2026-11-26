-- Approved shops can take online payments without a subscription.
-- A completed cash order records the platform commission. The next online
-- payout takes whole charges that fit after the online commission and Paystack's fee.

create table public.vendor_charges (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  amount_pesewas bigint not null,
  status text not null default 'open',
  payment_id uuid references public.payments (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint vendor_charges_order_key unique (order_id),
  constraint vendor_charges_amount_positive check (amount_pesewas > 0),
  constraint vendor_charges_status_known check (status in ('open', 'reserved', 'collected'))
);

alter table public.vendor_charges enable row level security;

create index vendor_charges_open_idx
  on public.vendor_charges (vendor_id, created_at, id)
  where status = 'open';

create index vendor_charges_payment_idx
  on public.vendor_charges (payment_id)
  where payment_id is not null;

create policy vendor_charges_select_owner
on public.vendor_charges
for select
to authenticated
using (
  exists (
    select 1
    from public.vendors
    where vendors.id = vendor_charges.vendor_id
      and vendors.owner_id = (select auth.uid())
  )
);

revoke insert, update, delete on table public.vendor_charges from public, anon, authenticated;

comment on table public.vendor_charges is
  'Platform commission owed from a completed cash order. Service role reserves and collects it.';

create or replace function public.record_cash_platform_charge(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_percent numeric;
  v_fee bigint;
begin
  select * into v_order
  from public.orders
  where orders.id = p_order_id;

  if not found
    or v_order.payment_method is distinct from 'cash_on_delivery'::public.payment_method
    or v_order.status is distinct from 'completed'::public.order_status
    or v_order.vendor_id is null
    or v_order.total_amount <= 0
  then
    return;
  end if;

  if exists (select 1 from public.vendor_charges where order_id = p_order_id) then
    return;
  end if;

  select (platform_settings.value #>> '{}')::numeric into v_percent
  from public.platform_settings
  where platform_settings.key = 'platform_commission_percent';

  if v_percent is null or v_percent <= 0 or v_percent > 100 then
    return;
  end if;

  v_fee := round(round(v_order.total_amount * 100) * v_percent / 100)::bigint;
  if v_fee < 1 then
    return;
  end if;

  insert into public.vendor_charges (vendor_id, order_id, amount_pesewas)
  values (v_order.vendor_id, v_order.id, v_fee);
end;
$$;

revoke all on function public.record_cash_platform_charge(uuid) from public, anon, authenticated;

create or replace function public.reserve_cash_charges(
  p_payment_id uuid,
  p_vendor_id uuid,
  p_room bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (select auth.role())
  );
  v_charge record;
  v_taken bigint := 0;
begin
  if v_role is distinct from 'service_role' then
    raise exception 'service role only';
  end if;

  if p_room is null or p_room <= 0 then
    return 0;
  end if;

  for v_charge in
    select id, amount_pesewas
    from public.vendor_charges
    where vendor_id = p_vendor_id
      and status = 'open'
    order by created_at, id
    for update
  loop
    exit when v_taken + v_charge.amount_pesewas > p_room;
    update public.vendor_charges
    set status = 'reserved', payment_id = p_payment_id
    where id = v_charge.id;
    v_taken := v_taken + v_charge.amount_pesewas;
  end loop;

  return v_taken;
end;
$$;

revoke all on function public.reserve_cash_charges(uuid, uuid, bigint) from public, anon, authenticated;
grant execute on function public.reserve_cash_charges(uuid, uuid, bigint) to service_role;

create or replace function public.apply_vendor_charge_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'success' and old.status is distinct from 'success' then
    update public.vendor_charges
    set status = 'collected'
    where payment_id = new.id
      and status = 'reserved';
  elsif new.status in ('failed', 'abandoned') and old.status is distinct from new.status then
    update public.vendor_charges
    set status = 'open', payment_id = null
    where payment_id = new.id
      and status = 'reserved';
  end if;
  return new;
end;
$$;

revoke all on function public.apply_vendor_charge_payment() from public, anon, authenticated;

create trigger payments_apply_vendor_charges
after update of status on public.payments
for each row
execute function public.apply_vendor_charge_payment();

create or replace function public.place_order(
  vendor_id uuid,
  items jsonb,
  buyer_note text,
  meeting_point text,
  p_payment_method text default 'cash_on_delivery'
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
  v_method text := coalesce(nullif(btrim(p_payment_method), ''), 'cash_on_delivery');
  v_item record;
  v_product record;
  v_product_ids uuid[] := '{}';
  v_titles text[] := '{}';
  v_prices numeric[] := '{}';
  v_quantities integer[] := '{}';
  v_total numeric := 0;
  v_min numeric;
  v_conversation_id uuid;
  v_order public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if v_method not in ('cash_on_delivery', 'paystack') then
    raise exception 'payment method must be cash on delivery or paystack';
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
  where profiles.id = v_uid;

  if v_buyer_name is null or btrim(v_buyer_name) = '' then
    raise exception 'add your name before placing an order';
  end if;

  select vendors.owner_id, vendors.shop_name into v_owner, v_shop_name
  from public.vendors
  where vendors.id = place_order.vendor_id
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

  if v_method = 'paystack' then
    select (platform_settings.value #>> '{}')::numeric into v_min
    from public.platform_settings
    where platform_settings.key = 'min_online_order_ghs';

    if v_min is null then
      raise exception 'online payments are not configured';
    end if;

    if v_total < v_min then
      raise exception 'online orders must be at least GHS %', to_char(v_min, 'FM99999990.00');
    end if;
  end if;

  v_conversation_id := public.get_or_create_conversation(place_order.vendor_id);

  insert into public.orders (
    buyer_id,
    vendor_id,
    vendor_user_id,
    conversation_id,
    payment_method,
    payment_status,
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
    v_method::public.payment_method,
    'unpaid'::public.payment_status,
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

revoke all on function public.place_order(uuid, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.place_order(uuid, jsonb, text, text, text) to authenticated;

create or replace function public.update_order_status(
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
  v_is_paystack boolean;
  v_allowed boolean := false;
  v_recipient uuid;
  v_body text;
  v_minutes integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_order
  from public.orders
  where orders.id = update_order_status.order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  v_is_buyer := v_order.buyer_id = v_uid;
  v_is_vendor := v_order.vendor_user_id = v_uid;
  v_is_paystack := v_order.payment_method = 'paystack'::public.payment_method;

  if v_order.buyer_id is distinct from v_uid
    and v_order.vendor_user_id is distinct from v_uid
  then
    raise exception 'order not found';
  end if;

  if new_status = 'cancelled'::public.order_status
    and v_order.payment_status in (
      'paid'::public.payment_status,
      'refund_pending'::public.payment_status
    )
  then
    raise exception 'Contact support to cancel a paid order';
  end if;

  if v_is_vendor
    and v_is_paystack
    and v_order.status = 'accepted'::public.order_status
    and new_status = 'ready'::public.order_status
    and v_order.payment_status is distinct from 'paid'::public.payment_status
  then
    raise exception 'payment is required before this order can be ready';
  end if;

  if v_is_vendor then
    v_allowed :=
      (v_order.status = 'pending'::public.order_status and new_status in ('accepted'::public.order_status, 'rejected'::public.order_status))
      or (v_order.status = 'accepted'::public.order_status and new_status in ('ready'::public.order_status, 'cancelled'::public.order_status))
      or (v_order.status = 'ready'::public.order_status and new_status = 'completed'::public.order_status);
    v_recipient := v_order.buyer_id;
  elsif v_is_buyer then
    v_allowed :=
      (
        v_order.status = 'pending'::public.order_status
        and new_status = 'cancelled'::public.order_status
      )
      or (
        v_is_paystack
        and v_order.status = 'accepted'::public.order_status
        and v_order.payment_status = 'unpaid'::public.payment_status
        and new_status = 'cancelled'::public.order_status
      );
    v_recipient := v_order.vendor_user_id;
  end if;

  if not v_allowed then
    raise exception 'that status change is not allowed';
  end if;

  v_minutes := null;
  if v_is_paystack and new_status = 'accepted'::public.order_status then
    select (platform_settings.value #>> '{}')::integer into v_minutes
    from public.platform_settings
    where platform_settings.key = 'unpaid_order_timeout_minutes';

    if v_minutes is null or v_minutes < 1 then
      raise exception 'online payments are not configured';
    end if;
  end if;

  update public.orders
  set
    status = new_status,
    payment_due_at = case
      when v_is_paystack and new_status = 'accepted'::public.order_status
        then pg_catalog.now() + make_interval(mins => v_minutes)
      else orders.payment_due_at
    end
  where orders.id = v_order.id
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

  if v_is_paystack and new_status = 'accepted'::public.order_status then
    perform public.enqueue_notification(
      v_order.buyer_id,
      'order_status',
      'Pay now to confirm your order',
      'Pay now to confirm your order',
      jsonb_build_object(
        'order_id', v_order.id,
        'conversation_id', v_order.conversation_id,
        'status', new_status
      )
    );
  end if;

  if not v_is_paystack and new_status = 'completed'::public.order_status then
    perform public.record_cash_platform_charge(v_order.id);
  end if;

  return v_order;
end;
$$;

revoke all on function public.update_order_status(uuid, public.order_status) from public, anon, authenticated;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;
