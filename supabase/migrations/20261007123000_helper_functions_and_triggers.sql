-- Helper functions and triggers.
-- Security-definer functions keep an empty search_path and schema-qualified names.
-- Clients cannot execute them unless a grant below says so.
-- raw_user_meta_data is read only to copy a display name. Role always comes from profiles.

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger vendors_set_updated_at
before update on public.vendors
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger product_images_set_updated_at
before update on public.product_images
for each row execute function public.set_updated_at();

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger messages_set_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger order_items_set_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

create trigger push_tokens_set_updated_at
before update on public.push_tokens
for each row execute function public.set_updated_at();

create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    -- Empty or over-long signup names must not fail account creation.
    nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 80), ''),
    'buyer'::public.user_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

comment on function public.handle_new_user() is
  'Creates a buyer profile. Does not read a role from user metadata.';

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.user_role
  );
$$;

comment on function public.is_admin() is
  'True when the caller profile role is admin. Never consults user metadata.';

create function public.vendor_is_public(vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vendors
    where id = vendor_id
      and status = 'approved'::public.vendor_status
      and is_paused = false
  );
$$;

comment on function public.vendor_is_public(uuid) is
  'True when the shop is approved and not paused. Bypasses RLS so catalog checks do not depend on the caller seeing the vendor row.';

-- Column privileges, not RLS. Role and vendor status are not in these lists,
-- so a client update cannot change them. Admin RPCs run as the function owner.
revoke update on table public.profiles from public, anon, authenticated;
grant update (full_name, phone, avatar_url, campus_location)
  on table public.profiles to authenticated;

revoke update on table public.vendors from public, anon, authenticated;
grant update (shop_name, description, logo_url, is_paused)
  on table public.vendors to authenticated;

create function public.enforce_product_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- Definer RPCs fire this trigger as their owner. The SQL editor and service
  -- role have no end-user JWT. Everyone else is limited to active or hidden,
  -- and cannot move a product out of removed_by_admin.
  if current_user in ('postgres', 'service_role', 'supabase_admin')
    or public.is_admin()
  then
    return new;
  end if;

  if old.status = 'removed_by_admin'::public.product_status
    or new.status not in (
      'active'::public.product_status,
      'hidden'::public.product_status
    )
  then
    raise exception 'only an admin can set this product status';
  end if;

  return new;
end;
$$;

create trigger products_enforce_status
before update of status on public.products
for each row execute function public.enforce_product_status_change();

create function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Definer so the sender can bump last_message_at without an update grant.
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  return new;
end;
$$;

create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_on_message();

-- Stored value is either "{user_id}/{file}" or a URL that contains "/<bucket>/".
-- A URL that does not contain the bucket is ignored so the queue never stores a full URL.
create function public.storage_object_path(target_bucket text, stored_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  marker text := '/' || target_bucket || '/';
  marker_at integer;
  object_path text;
begin
  if stored_value is null or btrim(stored_value) = '' then
    return null;
  end if;

  marker_at := position(marker in stored_value);
  if marker_at > 0 then
    object_path := substring(stored_value from marker_at + char_length(marker));
  elsif stored_value ~* '^https?://' then
    return null;
  else
    object_path := regexp_replace(stored_value, '^/+', '');
  end if;

  object_path := split_part(object_path, '?', 1);
  if object_path = '' then
    return null;
  end if;

  return object_path;
end;
$$;

create function public.enqueue_storage_cleanup(target_bucket text, stored_value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  object_path text;
begin
  object_path := public.storage_object_path(target_bucket, stored_value);
  if object_path is null then
    return;
  end if;

  insert into public.storage_cleanup_queue (bucket, path)
  values (target_bucket, object_path);
end;
$$;

create function public.queue_deleted_product_image()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enqueue_storage_cleanup('product-images', old.storage_path);
  return old;
end;
$$;

create trigger product_images_queue_cleanup
after delete on public.product_images
for each row execute function public.queue_deleted_product_image();

create function public.queue_replaced_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.avatar_url is distinct from new.avatar_url then
    perform public.enqueue_storage_cleanup('avatars', old.avatar_url);
  end if;
  return new;
end;
$$;

create trigger profiles_queue_old_avatar
after update of avatar_url on public.profiles
for each row execute function public.queue_replaced_avatar();

create function public.queue_replaced_logo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.logo_url is distinct from new.logo_url then
    perform public.enqueue_storage_cleanup('shop-logos', old.logo_url);
  end if;
  return new;
end;
$$;

create trigger vendors_queue_old_logo
after update of logo_url on public.vendors
for each row execute function public.queue_replaced_logo();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.enforce_product_status_change() from public, anon, authenticated;
revoke all on function public.touch_conversation_on_message() from public, anon, authenticated;
revoke all on function public.storage_object_path(text, text) from public, anon, authenticated;
revoke all on function public.enqueue_storage_cleanup(text, text) from public, anon, authenticated;
revoke all on function public.queue_deleted_product_image() from public, anon, authenticated;
revoke all on function public.queue_replaced_avatar() from public, anon, authenticated;
revoke all on function public.queue_replaced_logo() from public, anon, authenticated;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.vendor_is_public(uuid) from public, anon, authenticated;
grant execute on function public.vendor_is_public(uuid) to authenticated;
