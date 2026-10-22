import { Text, View } from 'react-native';

import { spacing, typography } from '@/constants/theme';

type StatTileProps = {
  value: string;
  label: string;
};

export function StatTile({ value, label }: StatTileProps) {
  return (
    <View accessibilityLabel={`${value} ${label}`} style={{ alignItems: 'center', gap: spacing.xxs }}>
      <Text style={typography.h1}>{value}</Text>
      <Text style={typography.caption}>{label}</Text>
    </View>
  );
}
