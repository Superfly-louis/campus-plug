import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { type IconName } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing } from '@/constants/theme';

type MarketplaceStateProps =
  | { status: 'loading'; skeleton?: ReactNode }
  | { status: 'error'; message: string; onRetry: () => void }
  | {
      status: 'empty';
      icon: IconName;
      title: string;
      body?: string;
      actionLabel?: string;
      onAction?: () => void;
    }
  | { status: 'ready'; children: ReactNode };

export function MarketplaceState(props: MarketplaceStateProps) {
  if (props.status === 'loading') {
    return props.skeleton ?? <DefaultSkeleton />;
  }
  if (props.status === 'error') {
    return (
      <View style={{ gap: spacing.md, paddingVertical: spacing.lg }}>
        <InlineError message={props.message} />
        <Button label="Try again" onPress={props.onRetry} />
      </View>
    );
  }
  if (props.status === 'empty') {
    return (
      <EmptyState
        icon={props.icon}
        title={props.title}
        body={props.body}
        actionLabel={props.actionLabel}
        onAction={props.onAction}
      />
    );
  }
  return props.children;
}

function DefaultSkeleton() {
  return (
    <View accessibilityLabel="Loading" style={{ gap: spacing.sm }}>
      <Skeleton height={spacing.huge} />
      <Skeleton height={spacing.xxl} />
      <Skeleton width="70%" height={spacing.xl} />
    </View>
  );
}

export function CoverSkeleton({ height }: { height: number }) {
  return <Skeleton height={height} rounded="xl" style={{ backgroundColor: colors.surface }} />;
}
