import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, icon, layout, motion, radius, spacing, typography } from '@/constants/theme';

type MessageComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onAddOrder?: () => void;
  sending?: boolean;
  disabled?: boolean;
  hint?: string;
};

export function MessageComposer({
  value,
  onChangeText,
  onSend,
  onAddOrder,
  sending = false,
  disabled = false,
  hint,
}: MessageComposerProps) {
  const empty = value.trim().length === 0;
  const blocked = disabled || sending || empty;

  return (
    <View style={{ gap: spacing.xs }}>
      {hint ? <Text style={[typography.caption, { color: colors.warning }]}>{hint}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}>
        {onAddOrder ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add an order"
            onPress={onAddOrder}
            style={({ pressed }) => ({
              width: layout.minTouchTarget,
              height: layout.minTouchTarget,
              borderRadius: radius.pill,
              borderWidth: layout.borderWidth,
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? motion.pressedOpacity : 1,
            })}
          >
            <Icon name="plus" color="textPrimary" />
          </Pressable>
        ) : null}
        <TextInput
          accessibilityLabel="Message"
          multiline
          onChangeText={onChangeText}
          placeholder="Write a message"
          placeholderTextColor={colors.textMuted}
          value={value}
          style={[
            typography.body,
            {
              flex: 1,
              minHeight: layout.minTouchTarget,
              maxHeight: spacing.huge * 2,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              borderWidth: layout.borderWidth,
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: blocked }}
          disabled={blocked}
          onPress={onSend}
          style={({ pressed }) => ({
            width: layout.minTouchTarget,
            height: layout.minTouchTarget,
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: blocked ? motion.disabledOpacity : pressed ? motion.pressedOpacity : 1,
          })}
        >
          <Icon name="arrow-right" color="textOnPrimary" size={icon.sm} />
        </Pressable>
      </View>
    </View>
  );
}
