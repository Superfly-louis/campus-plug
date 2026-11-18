export function entryPath(input: {
  signedIn: boolean;
  recovery: boolean;
  profileComplete: boolean;
  introSeen: boolean;
}) {
  if (input.recovery) return '/reset-password';
  if (!input.introSeen) return '/welcome';
  if (!input.signedIn) return '/sign-in';
  if (!input.profileComplete) return '/onboarding';
  return '/' as const;
}
