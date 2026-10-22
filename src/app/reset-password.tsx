import { useLocalSearchParams } from 'expo-router';
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
import { emailSchema, fieldError, otpSchema, passwordSchema } from '@/lib/validation';

function shown(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function firstString(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const { recovery, confirmPasswordReset, updatePassword } = useAuth();
  const [email, setEmail] = useState(firstString(params.email));
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    const nextPasswordError = fieldError(passwordSchema, password) ?? undefined;
    const usingLink = recovery && code.trim().length === 0;
    const nextEmailError = usingLink ? undefined : (fieldError(emailSchema, email) ?? undefined);
    const nextCodeError = usingLink ? undefined : (fieldError(otpSchema, code) ?? undefined);
    setEmailError(nextEmailError);
    setCodeError(nextCodeError);
    setPasswordError(nextPasswordError);
    setFormError(null);
    if (nextEmailError || nextCodeError || nextPasswordError) return;

    setSubmitting(true);
    const save = usingLink ? updatePassword(password) : confirmPasswordReset(email, code, password);
    void save
      .catch((error: unknown) => setFormError(shown(error, 'Could not update the password.')))
      .finally(() => setSubmitting(false));
  };

  return (
    <Screen scroll>
      <BrandWordmark />
      <HighlightedTitle highlight="password">Choose a new password</HighlightedTitle>
      <Text style={[typography.body, { color: colors.textMuted }]}>
        Enter the code from your email and choose a new password.
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
      <TextField
        error={codeError}
        keyboardType="number-pad"
        label="Code"
        onChangeText={setCode}
        placeholder="123456"
        value={code}
      />
      <TextField
        autoComplete="password"
        error={passwordError}
        icon="lock"
        label="New password"
        onChangeText={setPassword}
        secure
        textContentType="newPassword"
        value={password}
      />
      <Button label="Save password" loading={submitting} onPress={submit} />
    </Screen>
  );
}
