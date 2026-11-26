-- Own migration: a new enum value cannot be used in the same transaction.

alter type public.payment_status add value if not exists 'refund_pending';
