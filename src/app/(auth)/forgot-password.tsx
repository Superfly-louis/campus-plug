import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { BrandWordmark } from '@/components/illustrations/BrandWordmark';
import { HighlightedTitle } from '@/components/HighlightedTitle';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, layout, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { emailSchema, fieldError } from '@/lib/validation';

function shown(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    const nextEmailError = fieldError(emailSchema, email) ?? undefined;
    setEmailError(nextEmailError);
    setFormError(null);
    if (nextEmailError) return;

    setSubmitting(true);
    void requestPasswordReset(email)
      .then(() => {
        router.push({ pathname: '/reset-password', params: { email: email.trim().toLowerCase() } });
      })
      .catch((error: unknown) => setFormError(shown(error, 'Could not send the reset email.')))
      .finally(() => setSubmitting(false));
  };

  return (
    <Screen scroll>
      <BrandWordmark />
      <HighlightedTitle highlight="password">Reset your password</HighlightedTitle>
      <Text style={[typography.body, { color: colors.textMuted }]}>
        We will email you a code to choose a new password.
      </Text>
      {formError ? <InlineError message={formError} /> : null}
      <TextField
        autoComplete="email"
        error={emailError}
        icon="mail"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="you@central.edu.gh"
        textContentType="emailAddress"
        value={email}
      />
      <Button label="Send code" loading={submitting} onPress={submit} />
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/sign-in')}
        style={{ minHeight: layout.minTouchTarget, justifyContent: 'center' }}
      >
        <Text style={[typography.bodyMedium, { color: colors.lilac }]}>Back to sign in</Text>
      </Pressable>
    </Screen>
  );
}
