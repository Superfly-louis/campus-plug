import { router } from 'expo-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/lib/auth';
import { entryPath } from '@/lib/entry';
import { useIntro } from '@/lib/intro';

export default function NotFound() {
  const { session, profileComplete, recovery } = useAuth();
  const intro = useIntro();

  return (
    <Screen>
      <EmptyState
        icon="search"
        title="Page not found"
        body="That screen is not in Campus Plug."
        actionLabel="Go home"
        onAction={() =>
          router.replace(
            entryPath({
              signedIn: Boolean(session),
              recovery,
              profileComplete,
              introSeen: intro.seen === true,
            }),
          )
        }
      />
    </Screen>
  );
}
