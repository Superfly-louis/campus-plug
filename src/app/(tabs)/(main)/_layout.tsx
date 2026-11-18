import { NativeTabs } from 'expo-router/native-tabs';

import { colors } from '@/constants/theme';
import { useConversations } from '@/hooks/queries/useConversations';
import { useIncomingPendingCount } from '@/hooks/queries/useOrders';
import { useAuth } from '@/lib/auth';

export default function TabLayout() {
  const { vendor } = useAuth();
  const incoming = useIncomingPendingCount(vendor?.status === 'approved');
  const incomingCount = incoming.data ?? 0;
  const conversations = useConversations();
  const unread = (conversations.data ?? []).reduce((sum, row) => sum + row.unreadCount, 0);

  return (
    <NativeTabs
      tabBarRespectsIMEInsets
      iconColor={{ default: colors.periwinkle, selected: colors.primary }}
      labelStyle={{
        default: { color: colors.periwinkle },
        selected: { color: colors.primary },
      }}
      tintColor={colors.primary}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="home" sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="search" sf="magnifyingglass" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="chat" sf={{ default: 'message', selected: 'message.fill' }} />
        {unread > 0 ? (
          <NativeTabs.Trigger.Badge>{unread > 99 ? '99+' : String(unread)}</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="assignment" sf={{ default: 'clipboard', selected: 'clipboard.fill' }} />
        {incomingCount > 0 ? (
          <NativeTabs.Trigger.Badge>{incomingCount > 99 ? '99+' : String(incomingCount)}</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="person" sf={{ default: 'person', selected: 'person.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
