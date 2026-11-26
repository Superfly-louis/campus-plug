-- Cash on delivery transitions are unchanged. Paystack adds a payment deadline,
-- a paid check before ready, and a wider unpaid cancel window for the buyer.

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

  return v_order;
end;
$$;

revoke all on function public.update_order_status(uuid, public.order_status) from public, anon, authenticated;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;
