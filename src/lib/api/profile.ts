import { supabase } from '@/lib/supabase';
import {
  campusLocationSchema,
  emailSchema,
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

export type EmailChange = 'updated' | 'confirm';

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

export async function updateEmail(email: string): Promise<EmailChange> {
  const next = parseOrThrow(emailSchema, email).toLowerCase();
  const { data, error } = await supabase.auth.updateUser({ email: next }, { emailRedirectTo: 'campusplug://' });
  raiseIfError(error);
  const current = data.user?.email?.trim().toLowerCase();
  const pending = data.user?.new_email?.trim().toLowerCase();
  if (pending && pending !== current) return 'confirm';
  return 'updated';
}
