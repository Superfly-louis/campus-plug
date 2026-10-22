import type { ReactNode } from 'react';
import { View } from 'react-native';

import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { Skeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/constants/theme';
import { toFriendlyError } from '@/lib/errors';

export function OrderCardSkeleton() {
  return (
    <View accessibilityLabel="Loading orders" style={{ gap: spacing.sm }}>
      <Skeleton height={spacing.huge * 3} rounded="xl" />
      <Skeleton height={spacing.huge * 3} rounded="xl" />
    </View>
  );
}

type OrderListStateProps = {
  pending: boolean;
  error: unknown;
  empty: boolean;
  audience: 'buyer' | 'incoming';
  onRetry: () => void;
  onExplore?: () => void;
  children: ReactNode;
};

export function OrderListState({
  pending,
  error,
  empty,
  audience,
  onRetry,
  onExplore,
  children,
}: OrderListStateProps) {
  if (pending) return <OrderCardSkeleton />;
  if (error) {
    return <MarketplaceState message={toFriendlyError(error)} onRetry={onRetry} status="error" />;
  }
  if (empty) {
    return (
      <MarketplaceState
        actionLabel={audience === 'buyer' ? 'Start exploring' : undefined}
        body={
          audience === 'buyer'
            ? 'When you order from a campus shop, it shows up here.'
            : 'Orders from buyers will show up here.'
        }
        icon="clipboard-check"
        onAction={audience === 'buyer' ? onExplore : undefined}
        status="empty"
        title={audience === 'buyer' ? 'No orders yet' : 'No incoming orders yet'}
      />
    );
  }
  return children;
}

type OrderDetailStateProps = {
  pending: boolean;
  error: unknown;
  missing: boolean;
  onRetry: () => void;
  children: ReactNode;
};

export function OrderDetailState({ pending, error, missing, onRetry, children }: OrderDetailStateProps) {
  if (pending) return <OrderCardSkeleton />;
  if (error) {
    return <MarketplaceState message={toFriendlyError(error)} onRetry={onRetry} status="error" />;
  }
  if (missing) {
    return (
      <MarketplaceState
        body="It may have been removed, or you may not be part of it."
        icon="clipboard-check"
        status="empty"
        title="This order is not available"
      />
    );
  }
  return children;
}
