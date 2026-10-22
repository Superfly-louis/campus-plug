import type { ReactNode } from 'react';
import { View } from 'react-native';

import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { Skeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/constants/theme';
import { toFriendlyError } from '@/lib/errors';

export function ConversationSkeleton() {
  return (
    <View accessibilityLabel="Loading conversations" style={{ gap: spacing.sm }}>
      <Skeleton height={spacing.huge + spacing.xl} rounded="xl" />
      <Skeleton height={spacing.huge + spacing.xl} rounded="xl" />
      <Skeleton height={spacing.huge + spacing.xl} rounded="xl" />
    </View>
  );
}

type ConversationListStateProps = {
  pending: boolean;
  error: unknown;
  empty: boolean;
  onRetry: () => void;
  children: ReactNode;
};

export function ConversationListState({ pending, error, empty, onRetry, children }: ConversationListStateProps) {
  if (pending) return <ConversationSkeleton />;
  if (error) {
    return <MarketplaceState message={toFriendlyError(error)} onRetry={onRetry} status="error" />;
  }
  if (empty) {
    return (
      <MarketplaceState
        body="Messages with shops and buyers show up here."
        icon="message-circle"
        status="empty"
        title="No conversations yet"
      />
    );
  }
  return children;
}

type ThreadStateProps = {
  pending: boolean;
  error: unknown;
  empty: boolean;
  onRetry: () => void;
  children: ReactNode;
};

export function ThreadState({ pending, error, empty, onRetry, children }: ThreadStateProps) {
  if (pending) return <ConversationSkeleton />;
  if (error) {
    return <MarketplaceState message={toFriendlyError(error)} onRetry={onRetry} status="error" />;
  }
  if (empty) {
    return (
      <MarketplaceState
        body="Send a message, or place an order to start the chat."
        icon="message-circle"
        status="empty"
        title="No messages yet"
      />
    );
  }
  return children;
}
