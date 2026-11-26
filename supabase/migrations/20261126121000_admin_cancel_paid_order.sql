-- Admin only. Cancels a paid order and leaves the refund for the Paystack dashboard.

create function public.admin_cancel_paid_order(
  order_id uuid,
  reason text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_reason text := nullif(btrim(reason), '');
  v_body text := 'This paid order was cancelled. A refund is pending.';
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  if v_reason is null then
    raise exception 'a reason is required to cancel a paid order';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'reason is too long';
  end if;

  select * into v_order
  from public.orders
  where orders.id = admin_cancel_paid_order.order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if v_order.status = 'cancelled'::public.order_status
    or v_order.payment_status not in (
      'paid'::public.payment_status,
      'refund_pending'::public.payment_status
    )
  then
    raise exception 'that status change is not allowed';
  end if;

  update public.orders
  set
    status = 'cancelled'::public.order_status,
    payment_status = 'refund_pending'::public.payment_status
  where orders.id = v_order.id
  returning * into v_order;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (
    (select auth.uid()),
    'cancel_paid_order',
    'order',
    v_order.id,
    jsonb_build_object('reason', v_reason)
  );

  perform public.enqueue_notification(
    v_order.buyer_id,
    'order_status',
    'Order update',
    v_body,
    jsonb_build_object(
      'order_id', v_order.id,
      'conversation_id', v_order.conversation_id,
      'status', v_order.status
    )
  );

  perform public.enqueue_notification(
    v_order.vendor_user_id,
    'order_status',
    'Order update',
    v_body,
    jsonb_build_object(
      'order_id', v_order.id,
      'conversation_id', v_order.conversation_id,
      'status', v_order.status
    )
  );

  return v_order;
end;
$$;

revoke all on function public.admin_cancel_paid_order(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_cancel_paid_order(uuid, text) to authenticated;
