import { Pressable, Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/constants/theme';

type ChatBubbleProps = {
  body: string;
  time: string;
  mine: boolean;
  pending?: boolean;
  failed?: boolean;
  onRetry?: () => void;
};

export function ChatBubble({ body, time, mine, pending = false, failed = false, onRetry }: ChatBubbleProps) {
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: spacing.xxs }}>
      <View
        style={{
          maxWidth: '80%',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.lg,
          backgroundColor: mine ? colors.violet : colors.surface,
          borderWidth: mine ? 0 : layout.borderWidth,
          borderColor: colors.border,
        }}
      >
        <Text style={[typography.body, { color: colors.textPrimary }]}>{body}</Text>
      </View>
      <Text style={typography.caption}>{pending ? 'Sending…' : time}</Text>
      {failed && onRetry ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Retry message" onPress={onRetry}>
          <Text style={[typography.caption, { color: colors.danger }]}>Tap to retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
