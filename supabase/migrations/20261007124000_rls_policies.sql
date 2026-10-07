-- Row level security policies.
-- RLS is already enabled on every public table, so commands with no policy stay denied.
-- security definer RPCs bypass these policies. Anonymous users can read categories only.

-- Counterparties need a name and avatar, which profiles RLS would hide.
-- security_invoker stays off so this view runs as its owner and skips profiles RLS.
-- Phone, role, and campus_location are intentionally absent.
create view public.public_profiles
with (security_invoker = false) as
select
  id,
  full_name,
  avatar_url
from public.profiles;

comment on view public.public_profiles is
  'id, full_name, and avatar_url for authenticated users. Skips profiles RLS so chat and shop counterparties are visible.';

revoke all on table public.public_profiles from public, anon, authenticated;
grant select on table public.public_profiles to authenticated;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
);

-- Column grants from the previous migration limit this to name, phone, avatar, and campus.
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy vendors_select_public_owner_or_admin
on public.vendors
for select
to authenticated
using (
  status = 'approved'::public.vendor_status
  or owner_id = (select auth.uid())
  or (select public.is_admin())
);

create policy vendors_insert_own_pending
on public.vendors
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and status = 'pending'::public.vendor_status
);

create policy vendors_update_own
on public.vendors
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

revoke delete on table public.vendors from public, anon, authenticated;

create policy categories_select
on public.categories
for select
to anon, authenticated
using (true);

create policy categories_insert_admin
on public.categories
for insert
to authenticated
with check ((select public.is_admin()));

create policy categories_update_admin
on public.categories
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy categories_delete_admin
on public.categories
for delete
to authenticated
using ((select public.is_admin()));

create policy products_select_listed_owner_or_admin
on public.products
for select
to authenticated
using (
  (
    status = 'active'::public.product_status
    and public.vendor_is_public(vendor_id)
  )
  or exists (
    select 1
    from public.vendors
    where vendors.id = products.vendor_id
      and vendors.owner_id = (select auth.uid())
  )
  or (select public.is_admin())
);

create policy products_insert_approved_owner
on public.products
for insert
to authenticated
with check (
  status in (
    'active'::public.product_status,
    'hidden'::public.product_status
  )
  and exists (
    select 1
    from public.vendors
    where vendors.id = products.vendor_id
      and vendors.owner_id = (select auth.uid())
      and vendors.status = 'approved'::public.vendor_status
  )
);

create policy products_update_approved_owner
on public.products
for update
to authenticated
using (
  exists (
    select 1
    from public.vendors
    where vendors.id = products.vendor_id
      and vendors.owner_id = (select auth.uid())
      and vendors.status = 'approved'::public.vendor_status
  )
)
with check (
  exists (
    select 1
    from public.vendors
    where vendors.id = products.vendor_id
      and vendors.owner_id = (select auth.uid())
      and vendors.status = 'approved'::public.vendor_status
  )
);

create policy products_delete_approved_owner
on public.products
for delete
to authenticated
using (
  exists (
    select 1
    from public.vendors
    where vendors.id = products.vendor_id
      and vendors.owner_id = (select auth.uid())
      and vendors.status = 'approved'::public.vendor_status
  )
);

-- Select uses products RLS, so an image is visible exactly when its product is.
create policy product_images_select_with_product
on public.product_images
for select
to authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_images.product_id
  )
);

create policy product_images_insert_owner
on public.product_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.products
    join public.vendors on vendors.id = products.vendor_id
    where products.id = product_images.product_id
      and vendors.owner_id = (select auth.uid())
      and vendors.status = 'approved'::public.vendor_status
  )
);

create policy product_images_update_owner
on public.product_images
for update
to authenticated
using (
  exists (
    select 1
    from public.products
    join public.vendors on vendors.id = products.vendor_id
    where products.id = product_images.product_id
      and vendors.owner_id = (select auth.uid())
      and vendors.status = 'approved'::public.vendor_status
  )
)
with check (
  exists (
    select 1
    from public.products
    join public.vendors on vendors.id = products.vendor_id
    where products.id = product_images.product_id
      and vendors.owner_id = (select auth.uid())
      and vendors.status = 'approved'::public.vendor_status
  )
);

create policy product_images_delete_owner
on public.product_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.products
    join public.vendors on vendors.id = products.vendor_id
    where products.id = product_images.product_id
      and vendors.owner_id = (select auth.uid())
      and vendors.status = 'approved'::public.vendor_status
  )
);

create policy conversations_select_participant_or_admin
on public.conversations
for select
to authenticated
using (
  buyer_id = (select auth.uid())
  or vendor_user_id = (select auth.uid())
  or (select public.is_admin())
);

revoke insert, update, delete on table public.conversations from public, anon, authenticated;

create policy messages_select_participant
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and (
        conversations.buyer_id = (select auth.uid())
        or conversations.vendor_user_id = (select auth.uid())
      )
  )
);

-- order_id stays null so a text message cannot be attached to an order by the client.
create policy messages_insert_text_participant
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and type = 'text'::public.message_type
  and order_id is null
  and exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and (
        conversations.buyer_id = (select auth.uid())
        or conversations.vendor_user_id = (select auth.uid())
      )
  )
);

revoke update, delete on table public.messages from public, anon, authenticated;

create policy orders_select_party_or_admin
on public.orders
for select
to authenticated
using (
  buyer_id = (select auth.uid())
  or vendor_user_id = (select auth.uid())
  or (select public.is_admin())
);

revoke insert, update, delete on table public.orders from public, anon, authenticated;

create policy order_items_select_with_order
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
  )
);

revoke insert, update, delete on table public.order_items from public, anon, authenticated;

create policy push_tokens_own
on public.push_tokens
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy notifications_select_own
on public.notifications
for select
to authenticated
using (user_id = (select auth.uid()));

-- RLS cannot limit columns. The grant below is what keeps push fields unchanged.
revoke update on table public.notifications from public, anon, authenticated;
grant update (read_at) on table public.notifications to authenticated;

create policy notifications_update_own
on public.notifications
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke insert, delete on table public.notifications from public, anon, authenticated;

create policy admin_audit_log_select_admin
on public.admin_audit_log
for select
to authenticated
using ((select public.is_admin()));

revoke insert, update, delete on table public.admin_audit_log from public, anon, authenticated;

revoke all on table public.storage_cleanup_queue from public, anon, authenticated;
