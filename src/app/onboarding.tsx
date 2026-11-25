import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BrandWordmark } from '@/components/illustrations/BrandWordmark';
import { HighlightedTitle } from '@/components/HighlightedTitle';
import { Button } from '@/components/ui/Button';
import { CampusChoices } from '@/components/ui/CampusChoices';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, layout, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { campusLocationSchema, fullNameSchema, phoneSchema } from '@/lib/validation';
import { useThemeMode } from '@/lib/themeMode';

function shown(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function OnboardingScreen() {
  useThemeMode();
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
    <Screen paper scroll>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <BrandWordmark tone="paper" width={148} />
        <View style={{ alignSelf: 'stretch', gap: spacing.xxs }}>
          <HighlightedTitle color={colors.ink} highlight="profile">
            Set up your profile
          </HighlightedTitle>
          <Text style={[typography.body, { color: colors.inkMuted }]}>
            Add your name, phone, and campus.
          </Text>
        </View>
      </View>
      <View style={{ gap: spacing.md }}>
        {formError ? <InlineError message={formError} /> : null}
        <TextField
          autoCapitalize="words"
          autoComplete="name"
          error={nameError}
          icon="user"
          label="Full name"
          onChangeText={setFullName}
          textContentType="name"
          tone="paper"
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
          tone="paper"
          value={phone}
        />
        <CampusChoices error={campusError} onChange={setCampus} tone="paper" value={campus} />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Button label="Continue" loading={submitting} onPress={submit} />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: signingOut, busy: signingOut }}
          disabled={signingOut}
          onPress={logOut}
          style={{ minHeight: layout.minTouchTarget, justifyContent: 'center' }}
        >
          <Text style={[typography.bodyMedium, { color: colors.violet }]}>
            {signingOut ? 'Logging out…' : 'Log out'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
