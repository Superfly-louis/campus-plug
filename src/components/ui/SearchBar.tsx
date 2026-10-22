import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, control, icon, layout, motion, radius, spacing, typography } from '@/constants/theme';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Home uses the bar as one button. A submit control inside it is invalid in HTML. */
  readOnly?: boolean;
};

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search campus',
  autoFocus = false,
  readOnly = false,
}: SearchBarProps) {
  return (
    <View
      style={{
        minHeight: control.buttonLg,
        paddingLeft: spacing.md,
        paddingRight: spacing.xxs,
        borderRadius: radius.pill,
        borderWidth: layout.borderWidth,
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
      }}
    >
      <Icon name="search" color="lilac" />
      {readOnly ? (
        <Text style={[typography.body, { flex: 1, paddingVertical: spacing.sm, color: colors.textMuted }]}>
          {placeholder}
        </Text>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          accessibilityLabel={placeholder}
          autoFocus={autoFocus}
          style={[typography.body, { flex: 1, paddingVertical: spacing.sm }]}
        />
      )}
      {readOnly ? (
        <View
          style={{
            width: layout.minTouchTarget,
            height: layout.minTouchTarget,
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="arrow-right" size={icon.sm} color="textOnPrimary" />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search"
          onPress={onSubmit}
          style={({ pressed }) => ({
            width: layout.minTouchTarget,
            height: layout.minTouchTarget,
            borderRadius: radius.pill,
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? motion.pressedOpacity : 1,
          })}
        >
          <Icon name="arrow-right" size={icon.sm} color="textOnPrimary" />
        </Pressable>
      )}
    </View>
  );
}
