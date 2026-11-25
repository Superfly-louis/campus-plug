import { Pressable, Text, View } from 'react-native';

import { ReceiptMarks, receiptState } from '@/components/chat/ReceiptMarks';
import { UnreadBadge } from '@/components/chat/UnreadBadge';
import { Avatar } from '@/components/ui/Avatar';
import { colors, layout, spacing, typography } from '@/constants/theme';
import { useOnline } from '@/lib/presence';
import { useThemeMode } from '@/lib/themeMode';

type ConversationRowProps = {
  name: string;
  imageUrl: string | null;
  counterpartId: string;
  preview: string | null;
  previewMine: boolean;
  previewRead: boolean;
  time: string;
  unreadCount: number;
  onPress: () => void;
};

export function ConversationRow({
  name,
  imageUrl,
  counterpartId,
  preview,
  previewMine,
  previewRead,
  time,
  unreadCount,
  onPress,
}: ConversationRowProps) {
  useThemeMode();
  const shown = name.trim().length > 0 ? name : 'Deleted user';
  const online = useOnline(counterpartId);
  const unread = unreadCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shown}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: layout.borderWidth,
        borderBottomColor: colors.border,
      }}
    >
      <Avatar name={shown} online={online} uri={imageUrl} />
      <View style={{ flex: 1, minWidth: 0, gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text numberOfLines={1} style={[typography.bodyMedium, { flex: 1 }]}>
            {shown}
          </Text>
          <Text style={[typography.caption, { color: unread ? colors.primary : colors.textMuted }]}>{time}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {previewMine ? <ReceiptMarks state={receiptState(previewRead, online)} /> : null}
          <Text
            numberOfLines={1}
            style={[typography.bodySmall, { flex: 1, color: unread ? colors.textPrimary : colors.textMuted }]}
          >
            {preview ?? 'No messages yet'}
          </Text>
          <UnreadBadge count={unreadCount} />
        </View>
      </View>
    </Pressable>
  );
}
