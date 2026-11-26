-- Granted to service_role. pg_cron runs as the function owner, which can execute
-- it without a JWT, so this function does not check auth.role().

create function public.auto_cancel_unpaid_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_count integer := 0;
  v_body text := 'Order cancelled because payment was not received.';
begin
  for v_order in
    select orders.*
    from public.orders
    where orders.payment_method = 'paystack'::public.payment_method
      and orders.status = 'accepted'::public.order_status
      and orders.payment_status = 'unpaid'::public.payment_status
      and orders.payment_due_at < pg_catalog.now()
      and not exists (
        select 1
        from public.payments
        where payments.order_id = orders.id
          and payments.status = 'pending'
          and payments.created_at > pg_catalog.now() - interval '10 minutes'
      )
    for update of orders
    skip locked
  loop
    update public.orders
    set status = 'cancelled'::public.order_status
    where orders.id = v_order.id;

    if v_order.conversation_id is not null
      and coalesce(v_order.buyer_id, v_order.vendor_user_id) is not null
    then
      insert into public.messages (conversation_id, sender_id, type, body, order_id)
      values (
        v_order.conversation_id,
        coalesce(v_order.buyer_id, v_order.vendor_user_id),
        'system'::public.message_type,
        v_body,
        v_order.id
      );
    end if;

    perform public.enqueue_notification(
      v_order.buyer_id,
      'order_status',
      'Order update',
      v_body,
      jsonb_build_object(
        'order_id', v_order.id,
        'conversation_id', v_order.conversation_id,
        'status', 'cancelled'
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
        'status', 'cancelled'
      )
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.auto_cancel_unpaid_orders() from public, anon, authenticated;
grant execute on function public.auto_cancel_unpaid_orders() to service_role;

select cron.schedule(
  'auto-cancel-unpaid-orders',
  '*/5 * * * *',
  $$select public.auto_cancel_unpaid_orders()$$
);
