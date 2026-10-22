import { router } from 'expo-router';

import type { Vendor } from '@/lib/auth';

/** Opens apply, shop status, or the product form from the sell button. */
export function sellEntry(vendor: Vendor | null) {
  if (!vendor) {
    router.push('/vendor/apply');
    return;
  }
  if (vendor.status === 'approved') {
    router.push('/vendor/product-form');
    return;
  }
  router.push('/my-shop');
}
