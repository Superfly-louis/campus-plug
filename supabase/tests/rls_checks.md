# RLS checks

Run this in the Supabase SQL editor. It inserts fixture users, proves the checks below, and rolls back.

`auth.uid()` reads `request.jwt.claims` on current projects and `request.jwt.claim.sub` on older ones. The script sets both.

The checks are:

- a buyer cannot read another buyer's order
- a user cannot change their own role
- a non-admin cannot run `admin_review_vendor`
- a vendor cannot order from their own shop
- a paused vendor's product is hidden from a buyer
- a client cannot insert a notification, or a message of type `order` or `system`

```sql
begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'buyer-a@campusplug.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Buyer A"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'buyer-b@campusplug.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Buyer B"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'vendor@campusplug.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Vendor Owner"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-8444-444444444444',
    'authenticated',
    'authenticated',
    'paused@campusplug.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Paused Vendor"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  );

insert into public.categories (id, name, slug, sort_order)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'RLS Fixtures', 'rls-fixtures', 100);

insert into public.vendors (id, owner_id, shop_name, status, is_paused)
values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '33333333-3333-4333-8333-333333333333',
    'Open Shop',
    'approved',
    false
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '44444444-4444-4444-8444-444444444444',
    'Paused Shop',
    'approved',
    true
  );

update public.profiles
set role = 'vendor'
where id in (
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
);

insert into public.products (id, vendor_id, category_id, title, price, is_available, status)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Paused Item',
  5,
  true,
  'active'
);

insert into public.orders (
  id,
  buyer_id,
  vendor_id,
  vendor_user_id,
  status,
  total_amount,
  buyer_name_snapshot,
  shop_name_snapshot
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '33333333-3333-4333-8333-333333333333',
  'pending',
  5,
  'Buyer A',
  'Open Shop'
);

insert into public.conversations (id, buyer_id, vendor_id, vendor_user_id)
values (
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '33333333-3333-4333-8333-333333333333'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $$
declare
  visible_orders integer;
begin
  select count(*) into visible_orders
  from public.orders
  where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

  if visible_orders <> 0 then
    raise exception 'buyer B can read buyer A order';
  end if;
end $$;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

do $$
begin
  update public.profiles
  set role = 'admin'
  where id = auth.uid();

  raise exception 'user changed their own role';
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  perform public.admin_review_vendor(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'approved',
    null
  );
  raise exception 'non-admin ran admin_review_vendor';
exception
  when raise_exception then
    if sqlerrm is distinct from 'admin only' then
      raise;
    end if;
end $$;

do $$
declare
  visible_products integer;
begin
  select count(*) into visible_products
  from public.products
  where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  if visible_products <> 0 then
    raise exception 'paused vendor product is visible';
  end if;
end $$;

do $$
begin
  insert into public.notifications (user_id, type, title, body)
  values (auth.uid(), 'message', 'Nope', 'Client insert');
  raise exception 'client inserted a notification';
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  insert into public.messages (conversation_id, sender_id, type, body)
  values (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    auth.uid(),
    'order',
    'Fake order message'
  );
  raise exception 'client inserted an order message';
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  insert into public.messages (conversation_id, sender_id, type, body)
  values (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    auth.uid(),
    'system',
    'Fake system message'
  );
  raise exception 'client inserted a system message';
exception
  when insufficient_privilege then
    null;
end $$;

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

do $$
begin
  perform public.place_order(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '[{"product_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","quantity":1}]'::jsonb,
    null,
    null
  );
  raise exception 'own-shop order was allowed';
exception
  when raise_exception then
    if sqlerrm is distinct from 'you cannot order from your own shop' then
      raise;
    end if;
end $$;

rollback;
```
