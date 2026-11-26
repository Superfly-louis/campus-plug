-- Service role only. A failed or abandoned attempt leaves the order unpaid so the buyer can retry.

create function public.finalize_payment_failure(
  reference text,
  reason text
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
  v_status text;
begin
  if v_role is distinct from 'service_role' then
    raise exception 'service role only';
  end if;

  select * into v_payment
  from public.payments
  where payments.reference = finalize_payment_failure.reference
  for update;

  if not found then
    raise exception 'payment not found';
  end if;

  if v_payment.status in ('success', 'refunded', 'failed', 'abandoned') then
    return v_payment;
  end if;

  v_status := case
    when lower(btrim(coalesce(reason, ''))) = 'abandoned' then 'abandoned'
    else 'failed'
  end;

  update public.payments
  set status = v_status
  where payments.id = v_payment.id
  returning * into v_payment;

  select * into v_order
  from public.orders
  where orders.id = v_payment.order_id
  for update;

  if found and v_order.payment_status in (
    'unpaid'::public.payment_status,
    'pending'::public.payment_status
  ) then
    update public.orders
    set payment_status = 'unpaid'::public.payment_status
    where orders.id = v_order.id;
  end if;

  return v_payment;
end;
$$;

revoke all on function public.finalize_payment_failure(text, text) from public, anon, authenticated;
grant execute on function public.finalize_payment_failure(text, text) to service_role;

comment on function public.finalize_payment_failure(text, text) is
  'Service role only. Marks one checkout attempt failed or abandoned. Does not change an order that is already paid.';
