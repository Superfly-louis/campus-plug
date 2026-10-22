import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth';

export default function SellTab() {
  const { vendor } = useAuth();
  if (!vendor) return <Redirect href="/vendor/apply" />;
  if (vendor.status === 'approved') return <Redirect href="/vendor/product-form" />;
  return <Redirect href="/my-shop" />;
}
