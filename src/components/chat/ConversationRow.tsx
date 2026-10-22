import { Pressable, Text, View } from 'react-native';

import { UnreadBadge } from '@/components/chat/UnreadBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';

type ConversationRowProps = {
  name: string;
  imageUrl: string | null;
  preview: string | null;
  time: string;
  unreadCount: number;
  onPress: () => void;
};

export function ConversationRow({ name, imageUrl, preview, time, unreadCount, onPress }: ConversationRowProps) {
  const shown = name.trim().length > 0 ? name : 'Deleted user';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={shown} onPress={onPress}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Avatar name={shown} uri={imageUrl} />
          <View style={{ flex: 1, minWidth: 0, gap: spacing.xxs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text numberOfLines={1} style={[typography.bodyMedium, { flex: 1 }]}>
                {shown}
              </Text>
              <Text style={typography.caption}>{time}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text numberOfLines={1} style={[typography.bodySmall, { flex: 1, color: colors.textMuted }]}>
                {preview ?? 'No messages yet'}
              </Text>
              <UnreadBadge count={unreadCount} />
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
