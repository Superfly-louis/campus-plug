import { RefreshControl } from 'react-native';

import { colors } from '@/constants/theme';

type RefreshControlArgs = {
  refreshing: boolean;
  onRefresh: () => void;
};

export function refreshControlFor({ refreshing, onRefresh }: RefreshControlArgs) {
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
