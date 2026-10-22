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
import { emailSchema, fieldError } from '@/lib/validation';

function shown(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    const nextEmailError = fieldError(emailSchema, email) ?? undefined;
    const nextPasswordError = password.length === 0 ? 'Enter your password.' : undefined;
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(null);
    if (nextEmailError || nextPasswordError) return;

    setSubmitting(true);
    void signIn(email, password)
      .catch((error: unknown) => setFormError(shown(error, 'Could not sign in.')))
      .finally(() => setSubmitting(false));
  };

  return (
    <Screen scroll>
      <BrandWordmark />
      <HighlightedTitle highlight="back">Welcome back</HighlightedTitle>
      <Text style={[typography.body, { color: colors.textMuted }]}>Sign in to buy and sell on campus.</Text>
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
        autoComplete="password"
        error={passwordError}
        icon="lock"
        label="Password"
        onChangeText={setPassword}
        onSubmitEditing={submit}
        returnKeyType="go"
        secure
        textContentType="password"
        value={password}
      />
      <Button label="Sign in" loading={submitting} onPress={submit} />
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/forgot-password')}
        style={{ minHeight: layout.minTouchTarget, justifyContent: 'center' }}
      >
        <Text style={[typography.bodyMedium, { color: colors.lilac }]}>Forgot password</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: layout.minTouchTarget }}>
        <Text style={[typography.body, { color: colors.textMuted }]}>New here? </Text>
        <Pressable accessibilityRole="link" onPress={() => router.push('/sign-up')}>
          <Text style={[typography.bodyMedium, { color: colors.lilac }]}>Create an account</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
