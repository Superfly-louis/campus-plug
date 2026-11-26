-- Service role only. One transaction. Paystack retries must be safe.

create function public.finalize_payment_success(
  reference text,
  amount_pesewas bigint,
  currency text,
  channel text,
  fees jsonb
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (select auth.role())
  );
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_platform bigint;
  v_paystack bigint;
  v_vendor bigint;
  v_channel text := nullif(left(btrim(coalesce(channel, '')), 40), '');
  v_number numeric;
begin
  if v_role is distinct from 'service_role' then
    raise exception 'service role only';
  end if;

  select * into v_payment
  from public.payments
  where payments.reference = finalize_payment_success.reference
  for update;

  if not found then
    raise exception 'payment not found';
  end if;

  -- A retried webhook for a payment already marked success changes nothing.
  if v_payment.status = 'success' then
    return v_payment;
  end if;

  if amount_pesewas is distinct from v_payment.amount_pesewas then
    raise exception 'payment amount does not match';
  end if;

  if currency is distinct from 'GHS' then
    raise exception 'payment currency must be GHS';
  end if;

  select * into v_order
  from public.orders
  where orders.id = v_payment.order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  v_platform := null;
  v_paystack := null;
  v_vendor := null;
  if fees is not null and jsonb_typeof(fees) = 'object' then
    if jsonb_typeof(fees -> 'integration') = 'number' then
      v_number := (fees ->> 'integration')::numeric;
      if v_number >= 0 and v_number = trunc(v_number) then
        v_platform := v_number::bigint;
      end if;
    end if;
    if jsonb_typeof(fees -> 'paystack') = 'number' then
      v_number := (fees ->> 'paystack')::numeric;
      if v_number >= 0 and v_number = trunc(v_number) then
        v_paystack := v_number::bigint;
      end if;
    end if;
    if jsonb_typeof(fees -> 'subaccount') = 'number' then
      v_number := (fees ->> 'subaccount')::numeric;
      if v_number >= 0 and v_number = trunc(v_number) then
        v_vendor := v_number::bigint;
      end if;
    end if;
  end if;

  if v_order.payment_status = 'paid'::public.payment_status then
    update public.payments
    set
      status = 'success',
      channel = v_channel,
      platform_fee_pesewas = v_platform,
      paystack_fee_pesewas = v_paystack,
      vendor_amount_pesewas = v_vendor,
      needs_refund = true,
      paid_at = pg_catalog.now()
    where payments.id = v_payment.id
    returning * into v_payment;

    insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
    values (
      null,
      'duplicate_payment',
      'payment',
      v_payment.id,
      jsonb_build_object(
        'order_id', v_order.id,
        'reference', v_payment.reference
      )
    );

    return v_payment;
  end if;

  if v_order.status = 'cancelled'::public.order_status then
    update public.payments
    set
      status = 'success',
      channel = v_channel,
      platform_fee_pesewas = v_platform,
      paystack_fee_pesewas = v_paystack,
      vendor_amount_pesewas = v_vendor,
      needs_refund = true,
      paid_at = pg_catalog.now()
    where payments.id = v_payment.id
    returning * into v_payment;

    update public.orders
    set payment_status = 'refund_pending'::public.payment_status
    where orders.id = v_order.id;

    insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
    values (
      null,
      'payment_after_cancel',
      'order',
      v_order.id,
      jsonb_build_object(
        'payment_id', v_payment.id,
        'reference', v_payment.reference
      )
    );

    return v_payment;
  end if;

  update public.payments
  set
    status = 'success',
    channel = v_channel,
    platform_fee_pesewas = v_platform,
    paystack_fee_pesewas = v_paystack,
    vendor_amount_pesewas = v_vendor,
    needs_refund = false,
    paid_at = pg_catalog.now()
  where payments.id = v_payment.id
  returning * into v_payment;

  update public.orders
  set
    payment_status = 'paid'::public.payment_status,
    payment_reference = v_payment.reference
  where orders.id = v_order.id
  returning * into v_order;

  if v_order.conversation_id is not null and v_order.buyer_id is not null then
    insert into public.messages (conversation_id, sender_id, type, body, order_id)
    values (
      v_order.conversation_id,
      v_order.buyer_id,
      'system'::public.message_type,
      'Payment received',
      v_order.id
    );
  end if;

  perform public.enqueue_notification(
    v_order.vendor_user_id,
    'order_status',
    'Payment received',
    'Payment received, you can prepare the order',
    jsonb_build_object(
      'order_id', v_order.id,
      'conversation_id', v_order.conversation_id,
      'status', v_order.status
    )
  );

  perform public.enqueue_notification(
    v_order.buyer_id,
    'order_status',
    'Payment confirmed',
    'Payment confirmed',
    jsonb_build_object(
      'order_id', v_order.id,
      'conversation_id', v_order.conversation_id,
      'status', v_order.status
    )
  );

  return v_payment;
end;
$$;

revoke all on function public.finalize_payment_success(text, bigint, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_payment_success(text, bigint, text, text, jsonb) to service_role;

comment on function public.finalize_payment_success(text, bigint, text, text, jsonb) is
  'Service role only. Marks a Paystack charge paid, or flags a duplicate or late charge for a manual refund.';
