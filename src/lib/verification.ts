export function shopIsVerified(
  vendor: {
    status: string;
    subscription_status?: string | null;
    verified_until?: string | null;
  } | null | undefined,
  now = Date.now(),
): boolean {
  if (!vendor || vendor.status !== 'approved') return false;
  if (vendor.subscription_status !== 'active' && vendor.subscription_status !== 'past_due') return false;
  if (!vendor.verified_until) return false;
  const until = Date.parse(vendor.verified_until);
  return Number.isFinite(until) && until > now;
}
