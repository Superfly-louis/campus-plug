import { adminClient, userClient } from '../_shared/admin.ts';
import { handleOptions, json } from '../_shared/http.ts';
import { isStorageNotFound, storageObjectPath } from '../_shared/storage-path.ts';

type StoredObject = { bucket: string; path: string };

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'not authenticated' }, 401);

  const userScoped = userClient(authorization);
  const { data: userData, error: userError } = await userScoped.auth.getUser();
  if (userError || !userData.user) return json({ error: 'not authenticated' }, 401);

  const userId = userData.user.id;
  const admin = adminClient();

  try {
    const objects = await collectUserObjects(admin, userId);
    await deleteObjects(admin, objects);
  } catch (storageError) {
    console.error('account storage delete failed', storageError);
    return json({ error: 'storage delete failed' }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('auth user delete failed', deleteError.message);
    return json({ error: 'account delete failed' }, 500);
  }

  return json({ deleted: true });
});

async function collectUserObjects(
  admin: ReturnType<typeof adminClient>,
  userId: string,
): Promise<StoredObject[]> {
  const objects: StoredObject[] = [];

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  pushObject(objects, 'avatars', profile?.avatar_url ?? null);

  const { data: vendor, error: vendorError } = await admin
    .from('vendors')
    .select('id, logo_url')
    .eq('owner_id', userId)
    .maybeSingle();
  if (vendorError) throw new Error(vendorError.message);
  pushObject(objects, 'shop-logos', vendor?.logo_url ?? null);

  if (!vendor) return objects;

  const { data: products, error: productError } = await admin
    .from('products')
    .select('id')
    .eq('vendor_id', vendor.id);
  if (productError) throw new Error(productError.message);

  const productIds = (products ?? []).map((product) => product.id);
  if (productIds.length === 0) return objects;

  const { data: images, error: imageError } = await admin
    .from('product_images')
    .select('storage_path')
    .in('product_id', productIds);
  if (imageError) throw new Error(imageError.message);

  for (const image of images ?? []) {
    pushObject(objects, 'product-images', image.storage_path);
  }

  return objects;
}

function pushObject(objects: StoredObject[], bucket: string, stored: string | null): void {
  const path = storageObjectPath(bucket, stored);
  if (!path) return;
  objects.push({ bucket, path });
}

async function deleteObjects(
  admin: ReturnType<typeof adminClient>,
  objects: StoredObject[],
): Promise<void> {
  const seen = new Set<string>();
  for (const object of objects) {
    const key = `${object.bucket}/${object.path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const { error } = await admin.storage.from(object.bucket).remove([object.path]);
    if (error && !isStorageNotFound(error)) {
      throw new Error(error.message);
    }
  }
}
