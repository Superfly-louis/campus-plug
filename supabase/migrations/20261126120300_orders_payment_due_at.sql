alter table public.orders
  add column if not exists payment_due_at timestamptz;

comment on column public.orders.payment_due_at is
  'When an accepted Paystack order must be paid. Null for cash on delivery.';
