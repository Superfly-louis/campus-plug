import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { BrandWordmark } from '@/components/illustrations/BrandWordmark';
import { HighlightedTitle } from '@/components/HighlightedTitle';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, layout, limits, motion, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fieldError, otpSchema } from '@/lib/validation';

function shown(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function firstString(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

export default function VerifyEmailScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string | string[] }>();
  const email = firstString(emailParam);
  const { verifyEmailCode, resendSignupCode } = useAuth();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(limits.resendCooldownSec);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => {
      setSecondsLeft((current) => current - 1);
    }, motion.secondMs);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const submit = () => {
    const nextCodeError = fieldError(otpSchema, code) ?? undefined;
    setCodeError(nextCodeError);
    setFormError(null);
    if (!email) {
      setFormError('Go back and enter your email again.');
      return;
    }
    if (nextCodeError) return;

    setSubmitting(true);
    void verifyEmailCode(email, code)
      .catch((error: unknown) => setFormError(shown(error, 'Could not confirm that code.')))
      .finally(() => setSubmitting(false));
  };

  const resend = () => {
    if (!email || secondsLeft > 0 || resending) return;
    setFormError(null);
    setResending(true);
    void resendSignupCode(email)
      .then(() => setSecondsLeft(limits.resendCooldownSec))
      .catch((error: unknown) => setFormError(shown(error, 'Could not resend the code.')))
      .finally(() => setResending(false));
  };

  return (
    <Screen paper scroll>
      <BrandWordmark tone="paper" />
      <HighlightedTitle color={colors.ink} highlight="email">
        Confirm your email
      </HighlightedTitle>
      <Text style={[typography.body, { color: colors.inkMuted }]}>Enter the code we sent to your email.</Text>
      {formError ? <InlineError message={formError} /> : null}
      <TextField
        error={codeError}
        keyboardType="number-pad"
        label="Code"
        onChangeText={setCode}
        placeholder="123456"
        tone="paper"
        value={code}
      />
      <Button label="Confirm" loading={submitting} onPress={submit} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: secondsLeft > 0 || !email || resending }}
        disabled={secondsLeft > 0 || !email || resending}
        onPress={resend}
        style={{
          minHeight: layout.minTouchTarget,
          justifyContent: 'center',
          opacity: secondsLeft > 0 || !email ? motion.disabledOpacity : 1,
        }}
      >
        <Text style={[typography.bodyMedium, { color: colors.violet }]}>
          {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : resending ? 'Sending…' : 'Resend code'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/sign-in')}
        style={{ minHeight: layout.minTouchTarget, justifyContent: 'center' }}
      >
        <Text style={[typography.bodyMedium, { color: colors.violet }]}>Back to sign in</Text>
      </Pressable>
    </Screen>
  );
}
