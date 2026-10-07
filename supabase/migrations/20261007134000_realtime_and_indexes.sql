-- Realtime delivery and the indexes used by policies, search, and the push sweep.
-- Replica identity full lets update and delete events include the columns clients filter on.

alter table public.messages replica identity full;
alter table public.conversations replica identity full;
alter table public.orders replica identity full;
alter table public.notifications replica identity full;

alter publication supabase_realtime add table
  public.messages,
  public.conversations,
  public.orders,
  public.notifications;

create index products_vendor_id_idx
  on public.products (vendor_id);

create index products_catalog_idx
  on public.products (status, category_id, created_at desc);

create index products_search_idx
  on public.products
  using gin (search);

create index products_title_trgm_idx
  on public.products
  using gin (title extensions.gin_trgm_ops);

create index product_images_product_id_idx
  on public.product_images (product_id, position, created_at);

create index conversations_vendor_user_id_idx
  on public.conversations (vendor_user_id);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index messages_sender_id_idx
  on public.messages (sender_id);

create index orders_buyer_created_idx
  on public.orders (buyer_id, created_at);

create index orders_vendor_user_created_idx
  on public.orders (vendor_user_id, created_at);

create index order_items_order_id_idx
  on public.order_items (order_id);

create index push_tokens_user_id_idx
  on public.push_tokens (user_id);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index notifications_push_due_idx
  on public.notifications (next_attempt_at)
  where push_status in (
    'pending'::public.push_status,
    'failed'::public.push_status
  );
