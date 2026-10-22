import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, icon, radius, shadows, spacing, typography } from '@/constants/theme';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const circle = icon.xl + spacing.xl;

export function EmptyState({ icon: iconName, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
      <View
        accessibilityElementsHidden
        style={{
          width: circle,
          height: circle,
          borderRadius: radius.pill,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.glowLime,
        }}
      >
        <Icon name={iconName} size={icon.lg} color="primary" />
      </View>
      <Text accessibilityRole="header" style={[typography.h2, { textAlign: 'center' }]}>
        {title}
      </Text>
      {body ? (
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>{body}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} trailingArrow />
      ) : null}
    </View>
  );
}
