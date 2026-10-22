import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BrandWordmark } from '@/components/illustrations/BrandWordmark';
import { HighlightedTitle } from '@/components/HighlightedTitle';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, layout, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { emailSchema, fieldError, fullNameSchema, passwordSchema } from '@/lib/validation';

function shown(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    const nextNameError = fieldError(fullNameSchema, fullName) ?? undefined;
    const nextEmailError = fieldError(emailSchema, email) ?? undefined;
    const nextPasswordError = fieldError(passwordSchema, password) ?? undefined;
    setNameError(nextNameError);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(null);
    if (nextNameError || nextEmailError || nextPasswordError) return;

    setSubmitting(true);
    void signUp(email, password, fullName)
      .then((result) => {
        if (result === 'confirm') {
          router.push({ pathname: '/verify-email', params: { email: email.trim().toLowerCase() } });
        }
      })
      .catch((error: unknown) => setFormError(shown(error, 'Could not create the account.')))
      .finally(() => setSubmitting(false));
  };

  return (
    <Screen scroll>
      <BrandWordmark />
      <HighlightedTitle highlight="Campus Plug">Join Campus Plug</HighlightedTitle>
      <Text style={[typography.body, { color: colors.textMuted }]}>
        Create your account with your campus email.
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
        autoComplete="password"
        error={passwordError}
        icon="lock"
        label="Password"
        onChangeText={setPassword}
        secure
        textContentType="newPassword"
        value={password}
      />
      <Button label="Create account" loading={submitting} onPress={submit} />
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: layout.minTouchTarget }}>
        <Text style={[typography.body, { color: colors.textMuted }]}>Already have an account? </Text>
        <Pressable accessibilityRole="link" onPress={() => router.push('/sign-in')}>
          <Text style={[typography.bodyMedium, { color: colors.lilac }]}>Sign in</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
