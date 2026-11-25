import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, layout, motion, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

type SectionHeaderProps = {
  title: string;
  icon?: IconName;
  onSeeAll?: () => void;
};

export function SectionHeader({ title, icon, onSeeAll }: SectionHeaderProps) {
  useThemeMode();
  return (
    <View
      style={{
        minHeight: layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 }}>
        {icon ? <Icon name={icon} color="lilac" /> : null}
        <Text style={typography.h2}>{title}</Text>
      </View>
      {onSeeAll ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`See all ${title}`}
          onPress={onSeeAll}
          style={({ pressed }) => ({
            minHeight: layout.minTouchTarget,
            justifyContent: 'center',
            opacity: pressed ? motion.pressedOpacity : 1,
          })}
        >
          <Text style={[typography.bodyMedium, { color: colors.lilac }]}>See all →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
