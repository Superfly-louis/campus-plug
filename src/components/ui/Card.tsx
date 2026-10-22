import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors, layout, radius, shadows, spacing } from '@/constants/theme';

type CardProps = {
  children: ReactNode;
  padded?: boolean;
};

export function Card({ children, padded = true }: CardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: layout.borderWidth,
        borderColor: colors.border,
        borderRadius: radius.xl,
        padding: padded ? spacing.lg : 0,
        gap: padded ? spacing.md : 0,
        ...shadows.card,
      }}
    >
      {children}
    </View>
  );
}
