import { useQuery } from '@tanstack/react-query';

import { listCategories } from '@/lib/api/categories';

import { queryKeys } from '@/hooks/queries/keys';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
  });
}
