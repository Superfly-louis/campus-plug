import { Pressable, Text, View } from 'react-native';

import { ReceiptMarks, type ReceiptState } from '@/components/chat/ReceiptMarks';
import { colors, radius, spacing, typography } from '@/constants/theme';

type ChatBubbleProps = {
  body: string;
  time: string;
  mine: boolean;
  pending?: boolean;
  failed?: boolean;
  receipt?: ReceiptState | null;
  onRetry?: () => void;
};

export function ChatBubble({ body, time, mine, pending = false, failed = false, receipt = null, onRetry }: ChatBubbleProps) {
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: spacing.xxs }}>
      <View
        style={{
          maxWidth: '82%',
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          borderBottomLeftRadius: mine ? radius.lg : radius.sm,
          borderBottomRightRadius: mine ? radius.sm : radius.lg,
          backgroundColor: mine ? colors.violet : colors.surfaceAlt,
        }}
      >
        <Text style={[typography.body, { color: colors.textPrimary }]}>{body}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.xxs }}>
          <Text style={[typography.caption, { color: mine ? colors.lilac : colors.textMuted }]}>
            {pending ? 'Sending' : time}
          </Text>
          {mine && receipt ? <ReceiptMarks state={receipt} /> : null}
        </View>
      </View>
      {failed && onRetry ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Retry message" onPress={onRetry}>
          <Text style={[typography.caption, { color: colors.danger }]}>Tap to retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
