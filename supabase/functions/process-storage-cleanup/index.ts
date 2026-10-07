import { adminClient } from '../_shared/admin.ts';
import { handleOptions, json, webhookSecretMatches } from '../_shared/http.ts';
import { isStorageNotFound } from '../_shared/storage-path.ts';

type QueueRow = {
  id: string;
  bucket: string;
  path: string;
  attempts: number;
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!(await webhookSecretMatches(req, 'CLEANUP_WEBHOOK_SECRET'))) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabase = adminClient();
  const { data, error } = await supabase
    .from('storage_cleanup_queue')
    .select('id, bucket, path, attempts')
    .is('processed_at', null)
    .lt('attempts', 10)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) {
    console.error('cleanup queue read failed', error.message);
    return json({ error: 'queue read failed' }, 500);
  }

  let processed = 0;
  let failed = 0;
  for (const row of (data ?? []) as QueueRow[]) {
    const { error: removeError } = await supabase.storage.from(row.bucket).remove([row.path]);
    if (!removeError || isStorageNotFound(removeError)) {
      const { error: updateError } = await supabase
        .from('storage_cleanup_queue')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', row.id);
      if (updateError) {
        failed += 1;
        console.error('cleanup mark processed failed', updateError.message);
      } else {
        processed += 1;
      }
      continue;
    }

    failed += 1;
    await supabase
      .from('storage_cleanup_queue')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id);
    console.error('storage cleanup failed', removeError.message);
  }

  return json({ processed, failed });
});
