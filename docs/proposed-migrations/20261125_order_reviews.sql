-- Run this in the Supabase SQL editor.
-- A buyer can leave one review after a completed order. Shop cards and the shop page read the real rows.

create table public.order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique,
  vendor_id uuid not null,
  buyer_id uuid not null,
  buyer_name text not null,
  rating smallint not null,
  body text,
  created_at timestamptz not null default now(),
  constraint order_reviews_rating_range check (rating between 1 and 5),
  constraint order_reviews_body_length check (body is null or char_length(body) <= 300),
  constraint order_reviews_order_id_fkey foreign key (order_id) references public.orders (id),
  constraint order_reviews_vendor_id_fkey foreign key (vendor_id) references public.vendors (id),
  constraint order_reviews_buyer_id_fkey foreign key (buyer_id) references public.profiles (id)
);

create index order_reviews_vendor_created_idx
  on public.order_reviews (vendor_id, created_at desc);

alter table public.order_reviews enable row level security;

revoke all on table public.order_reviews from public, anon, authenticated;
grant select on table public.order_reviews to authenticated;

create policy order_reviews_select_visible
on public.order_reviews
for select
to authenticated
using (
  buyer_id = (select auth.uid())
  or (select public.is_admin())
  or exists (
    select 1
    from public.vendors
    where vendors.id = order_reviews.vendor_id
      and (
        vendors.status = 'approved'::public.vendor_status
        or vendors.owner_id = (select auth.uid())
      )
  )
);

create or replace function public.submit_order_review(
  order_id uuid,
  rating integer,
  body text
)
returns public.order_reviews
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_name text;
  v_body text := nullif(btrim(submit_order_review.body), '');
  v_review public.order_reviews%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if submit_order_review.rating is null
    or submit_order_review.rating < 1
    or submit_order_review.rating > 5 then
    raise exception 'rating must be from 1 to 5';
  end if;

  if v_body is not null and char_length(v_body) > 300 then
    raise exception 'review is too long';
  end if;

  select * into v_order
  from public.orders
  where id = submit_order_review.order_id;

  if not found or v_order.vendor_id is null then
    raise exception 'order not found';
  end if;

  if v_order.buyer_id is distinct from v_uid then
    raise exception 'only the buyer can review this order';
  end if;

  if v_order.status is distinct from 'completed'::public.order_status then
    raise exception 'review a completed order';
  end if;

  if exists (
    select 1
    from public.order_reviews
    where order_reviews.order_id = v_order.id
  ) then
    raise exception 'this order already has a review';
  end if;

  select full_name into v_name
  from public.profiles
  where id = v_uid;

  if v_name is null or btrim(v_name) = '' then
    v_name := v_order.buyer_name_snapshot;
  end if;

  insert into public.order_reviews (order_id, vendor_id, buyer_id, buyer_name, rating, body)
  values (v_order.id, v_order.vendor_id, v_uid, btrim(v_name), submit_order_review.rating, v_body)
  returning * into v_review;

  return v_review;
end;
$$;

create or replace function public.list_shop_reviews(vendor_id uuid)
returns table (
  id uuid,
  buyer_name text,
  rating smallint,
  body text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id, r.buyer_name, r.rating, r.body, r.created_at
  from public.order_reviews as r
  where r.vendor_id = list_shop_reviews.vendor_id
  order by r.created_at desc
  limit 20;
$$;

create or replace function public.shop_review_summaries()
returns table (
  vendor_id uuid,
  rating_avg numeric,
  review_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.vendor_id, round(avg(r.rating), 1), count(*)::bigint
  from public.order_reviews as r
  group by r.vendor_id;
$$;

create or replace function public.order_review(order_id uuid)
returns table (
  id uuid,
  rating smallint,
  body text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id, r.rating, r.body, r.created_at
  from public.order_reviews as r
  where r.order_id = order_review.order_id
    and r.buyer_id = (select auth.uid());
$$;

revoke all on function public.submit_order_review(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.submit_order_review(uuid, integer, text) to authenticated;

revoke all on function public.list_shop_reviews(uuid) from public, anon, authenticated;
grant execute on function public.list_shop_reviews(uuid) to authenticated;

revoke all on function public.shop_review_summaries() from public, anon, authenticated;
grant execute on function public.shop_review_summaries() to authenticated;

revoke all on function public.order_review(uuid) from public, anon, authenticated;
grant execute on function public.order_review(uuid) to authenticated;
