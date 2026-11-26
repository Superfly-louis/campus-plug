-- Runs as the owner so the payments join is not hidden by payments RLS.
-- is_admin() removes every row for anyone who is not an admin.

create view public.orders_needing_refund
with (security_invoker = false, security_barrier = true)
as
select
  orders.id,
  orders.buyer_id,
  orders.vendor_id,
  orders.vendor_user_id,
  orders.conversation_id,
  orders.status,
  orders.payment_method,
  orders.payment_status,
  orders.payment_reference,
  orders.payment_due_at,
  orders.total_amount,
  orders.buyer_name_snapshot,
  orders.shop_name_snapshot,
  orders.created_at,
  orders.updated_at,
  exists (
    select 1
    from public.payments
    where payments.order_id = orders.id
      and payments.needs_refund = true
  ) as needs_refund
from public.orders
where public.is_admin()
  and (
    orders.payment_status = 'refund_pending'::public.payment_status
    or exists (
      select 1
      from public.payments
      where payments.order_id = orders.id
        and payments.needs_refund = true
    )
  );

revoke all on table public.orders_needing_refund from public, anon, authenticated;
grant select on table public.orders_needing_refund to authenticated;

comment on view public.orders_needing_refund is
  'Paid orders an admin still needs to refund in the Paystack dashboard. Empty for everyone else.';
