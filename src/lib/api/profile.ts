import { supabase } from '@/lib/supabase';
import {
  campusLocationSchema,
  fullNameSchema,
  parseOrThrow,
  phoneSchema,
} from '@/lib/validation';

import { raiseIfError, requireUserId } from '@/lib/api/shared';

export type ProfileUpdate = {
  fullName: string;
  phone: string;
  campus: string;
  avatarUrl?: string;
};

export async function updateProfile(input: ProfileUpdate): Promise<void> {
  const userId = await requireUserId();
  const patch: {
    full_name: string;
    phone: string;
    campus_location: string;
    avatar_url?: string;
  } = {
    full_name: parseOrThrow(fullNameSchema, input.fullName),
    phone: parseOrThrow(phoneSchema, input.phone),
    campus_location: parseOrThrow(campusLocationSchema, input.campus),
  };
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  raiseIfError(error);
}
