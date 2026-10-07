-- Public image buckets. A public bucket can be read by its object URL.
-- There is no SELECT policy for other people's files, so clients cannot list a bucket.
-- Authenticated users can select their own prefix because overwrite (upsert) requires it.
-- Deleting a storage.objects row does not delete the file in Storage.
-- Those paths are queued in storage_cleanup_queue and removed by a later Edge Function.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'product-images',
    'product-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  ),
  (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  ),
  (
    'shop-logos',
    'shop-logos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {user_id}/{uuid}.jpg
-- Writes are allowed only when the first folder is the caller's auth id.
create policy storage_objects_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('product-images', 'avatars', 'shop-logos')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy storage_objects_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id in ('product-images', 'avatars', 'shop-logos')
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id in ('product-images', 'avatars', 'shop-logos')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy storage_objects_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('product-images', 'avatars', 'shop-logos')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy storage_objects_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id in ('product-images', 'avatars', 'shop-logos')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
