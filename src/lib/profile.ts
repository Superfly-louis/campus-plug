import type { Database } from '../../types/database.types';

export type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'phone' | 'avatar_url' | 'campus_location' | 'role'
>;

export type UserRole = Profile['role'];

export function isOnboarded(profile: Profile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.full_name?.trim() && profile.phone?.trim() && profile.campus_location?.trim(),
  );
}

export function roleLabel(role: UserRole): string {
  if (role === 'admin') return 'Admin';
  if (role === 'vendor') return 'Vendor';
  return 'Buyer';
}
