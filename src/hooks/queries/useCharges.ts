import { useQuery } from '@tanstack/react-query';

import { listVendorCharges } from '@/lib/api/charges';

import { queryKeys } from '@/hooks/queries/keys';

export function useVendorCharges(vendorId: string | null) {
  return useQuery({
    queryKey: queryKeys.charges.vendor(vendorId ?? ''),
    enabled: vendorId != null && vendorId.length > 0,
    queryFn: () => listVendorCharges(vendorId ?? ''),
  });
}
