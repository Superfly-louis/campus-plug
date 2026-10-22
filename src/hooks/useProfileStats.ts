import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

async function countRows(
  run: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const { count, error } = await run();
  if (error) throw error;
  return count ?? 0;
}

export function useProfileStats() {
  const { session, vendor } = useAuth();
  const userId = session?.user.id;
  const vendorId = vendor?.id;

  const orders = useQuery({
    queryKey: ['profile', 'orders', userId],
    enabled: Boolean(userId),
    queryFn: () =>
      countRows(() =>
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .or(`buyer_id.eq.${userId},vendor_user_id.eq.${userId}`),
      ),
  });

  const listings = useQuery({
    queryKey: ['profile', 'listings', vendorId],
    enabled: Boolean(vendorId),
    queryFn: () =>
      countRows(() =>
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('vendor_id', vendorId ?? ''),
      ),
  });

  const active = useQuery({
    queryKey: ['profile', 'active', vendorId],
    enabled: Boolean(vendorId),
    queryFn: () =>
      countRows(() =>
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId ?? '')
          .eq('status', 'active'),
      ),
  });

  return {
    orders: orders.isSuccess ? orders.data : null,
    listings: vendor && listings.isSuccess ? listings.data : null,
    active: vendor && active.isSuccess ? active.data : null,
  };
}
