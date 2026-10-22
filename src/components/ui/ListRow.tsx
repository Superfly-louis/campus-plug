import { Pressable, Text, View } from 'react-native';

import { UnreadBadge } from '@/components/chat/UnreadBadge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, layout, motion, radius, spacing, typography } from '@/constants/theme';

type ListRowProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  detail?: string;
  badge?: number;
  highlighted?: boolean;
  onPress?: () => void;
};

export function ListRow({
  icon,
  title,
  subtitle,
  detail,
  badge = 0,
  highlighted = false,
  onPress,
}: ListRowProps) {
  const unread = highlighted ? ', unread' : '';
  const label =
    badge > 0
      ? `${title}, ${badge > 99 ? '99+' : badge} unread`
      : subtitle
        ? `${title}${unread}. ${subtitle}`
        : `${title}${unread}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: highlighted, disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: layout.minTouchTarget,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: highlighted ? colors.indigoDeep : pressed ? colors.surfaceAlt : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        opacity: pressed ? motion.pressedOpacity : 1,
      })}
    >
      <View
        style={{
          width: spacing.xxxl,
          height: spacing.xxxl,
          borderRadius: radius.pill,
          backgroundColor: highlighted ? colors.violet : colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} color={highlighted ? 'textPrimary' : 'lilac'} />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text numberOfLines={1} style={[typography.bodyMedium, { flex: 1 }]}>
            {title}
          </Text>
          {detail ? <Text style={typography.caption}>{detail}</Text> : null}
        </View>
        {subtitle ? (
          <Text numberOfLines={2} style={typography.caption}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <UnreadBadge count={badge} />
      <Icon name="chevron-right" color="periwinkle" />
    </Pressable>
  );
}
