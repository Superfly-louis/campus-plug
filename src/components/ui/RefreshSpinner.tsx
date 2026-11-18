import { RefreshControl } from 'react-native';

import { colors } from '@/constants/theme';

type RefreshSpinnerProps = {
  refreshing: boolean;
  onRefresh: () => void;
};

export function RefreshSpinner({ refreshing, onRefresh }: RefreshSpinnerProps) {
  return (
    <RefreshControl
      colors={[colors.primary]}
      onRefresh={onRefresh}
      progressBackgroundColor={colors.surface}
      refreshing={refreshing}
      tintColor={colors.primary}
    />
  );
}
