import { useState } from 'react';
import { Text } from 'react-native';

import { BrandWordmark } from '@/components/illustrations/BrandWordmark';
import { HighlightedTitle } from '@/components/HighlightedTitle';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { campusLocationSchema, fullNameSchema, phoneSchema } from '@/lib/validation';

function shown(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function OnboardingScreen() {
  const { profile, completeOnboarding, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [campus, setCampus] = useState(profile?.campus_location ?? '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [campusError, setCampusError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const submit = () => {
    const name = fullNameSchema.safeParse(fullName);
    const parsedPhone = phoneSchema.safeParse(phone);
    const parsedCampus = campusLocationSchema.safeParse(campus);
    const nextNameError = name.success ? undefined : name.error.issues[0]?.message;
    const nextPhoneError = parsedPhone.success ? undefined : parsedPhone.error.issues[0]?.message;
    const nextCampusError = parsedCampus.success ? undefined : parsedCampus.error.issues[0]?.message;
    setNameError(nextNameError);
    setPhoneError(nextPhoneError);
    setCampusError(nextCampusError);
    setFormError(null);
    if (!name.success || !parsedPhone.success || !parsedCampus.success) return;

    setSubmitting(true);
    void completeOnboarding({
      fullName: name.data,
      phone: parsedPhone.data,
      campus: parsedCampus.data,
    })
      .catch((error: unknown) => setFormError(shown(error, 'Could not save your profile.')))
      .finally(() => setSubmitting(false));
  };

  const logOut = () => {
    setSigningOut(true);
    void signOut()
      .catch((error: unknown) => setFormError(shown(error, 'Could not log out.')))
      .finally(() => setSigningOut(false));
  };

  return (
    <Screen scroll>
      <BrandWordmark />
      <HighlightedTitle highlight="profile">Set up your profile</HighlightedTitle>
      <Text style={[typography.body, { color: colors.textMuted }]}>
        Add your name, phone, and where you are on campus.
      </Text>
      {formError ? <InlineError message={formError} /> : null}
      <TextField
        autoCapitalize="words"
        autoComplete="name"
        error={nameError}
        icon="user"
        label="Full name"
        onChangeText={setFullName}
        textContentType="name"
        value={fullName}
      />
      <TextField
        autoComplete="tel"
        error={phoneError}
        icon="phone"
        keyboardType="phone-pad"
        label="Phone"
        onChangeText={setPhone}
        placeholder="0240000000"
        textContentType="telephoneNumber"
        value={phone}
      />
      <TextField
        autoCapitalize="words"
        error={campusError}
        icon="map-pin"
        label="Hall, hostel or area"
        onChangeText={setCampus}
        placeholder="Miotso"
        value={campus}
      />
      <Button label="Continue" loading={submitting} onPress={submit} />
      <Button disabled={signingOut} label="Log out" loading={signingOut} onPress={logOut} variant="ghost" />
    </Screen>
  );
}
