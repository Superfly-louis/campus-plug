import { router, Stack, useSegments, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, icon, motion, radius, spacing, typography } from '@/constants/theme';
import { useConversations } from '@/hooks/queries/useConversations';
import { useIncomingPendingCount } from '@/hooks/queries/useOrders';
import { useAuth } from '@/lib/auth';
import { useThemeMode } from '@/lib/themeMode';

const tabs = [
  { name: 'index', href: '/' as Href, label: 'Home', icon: 'house' as IconName },
  { name: 'explore', href: '/explore' as Href, label: 'Explore', icon: 'search' as IconName },
  { name: 'messages', href: '/messages' as Href, label: 'Chats', icon: 'message-circle' as IconName },
  { name: 'orders', href: '/orders' as Href, label: 'Orders', icon: 'clipboard-check' as IconName },
  { name: 'profile', href: '/profile' as Href, label: 'Profile', icon: 'user' as IconName },
] as const;

export const unstable_settings = {
  anchor: 'index',
};

function badge(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? '99+' : String(count);
}

function AndroidTabBar() {
  useThemeMode();
  const insets = useSafeAreaInsets();
  const segments: readonly string[] = useSegments();
  const leaf = segments[segments.length - 1];
  const active = leaf === '(main)' || leaf === 'index' ? 'index' : leaf;
  const { vendor } = useAuth();
  const incoming = useIncomingPendingCount(vendor?.status === 'approved');
  const conversations = useConversations();
  const unread = (conversations.data ?? []).reduce((sum, row) => sum + row.unreadCount, 0);
  const marks: Record<string, string | undefined> = {
    messages: badge(unread),
    orders: badge(incoming.data ?? 0),
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xs,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.pill,
          padding: spacing.xxs,
        }}
      >
        {tabs.map((tab) => (
          <TabButton
            active={active === tab.name}
            href={tab.href}
            badge={marks[tab.name]}
            icon={tab.icon}
            key={tab.name}
            label={tab.label}
          />
        ))}
      </View>
    </View>
  );
}

function TabButton({
  active,
  badge: mark,
  href,
  icon: iconName,
  label,
}: {
  active: boolean;
  badge?: string;
  href: Href;
  icon: IconName;
  label: string;
}) {
  useThemeMode();
  const tint = active ? 'textOnPrimary' : 'periwinkle';
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={mark ? `${label}, ${mark}` : label}
      onPress={() => router.navigate(href)}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xxs,
        paddingVertical: spacing.xxs,
        paddingHorizontal: spacing.xxs,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.primary : 'transparent',
        opacity: pressed ? motion.pressedOpacity : 1,
      })}
    >
      <View>
        <Icon color={tint} name={iconName} size={icon.md} />
        {mark ? (
          <View
            style={{
              position: 'absolute',
              top: -spacing.xxs,
              right: -spacing.sm,
              minWidth: icon.sm,
              height: icon.sm,
              borderRadius: radius.pill,
              paddingHorizontal: spacing.xxs,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.violet,
            }}
          >
            <Text style={[typography.caption, { color: colors.paper, fontSize: 10, lineHeight: 12 }]}>{mark}</Text>
          </View>
        ) : null}
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={1}
        style={[typography.caption, { color: colors[tint], textAlign: 'center', width: '100%' }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AndroidTabLayout() {
  useThemeMode();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </View>
      <AndroidTabBar />
    </View>
  );
}
