import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import * as Linking from 'expo-linking';

import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { PageHero } from '@/components/ui/PageHero';
import { Screen } from '@/components/ui/Screen';
import { ShellHeader } from '@/components/ui/ShellHeader';
import { StatTile } from '@/components/ui/StatTile';
import { SUPPORT_URL } from '@/constants/config';
import { colors, icon, layout, spacing, typography } from '@/constants/theme';
import { useConversations } from '@/hooks/queries/useConversations';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useAuth } from '@/lib/auth';
import { getImageUrl } from '@/lib/images';

export default function ProfileScreen() {
  const { profile, vendor, signOut } = useAuth();
  const stats = useProfileStats();
  const conversations = useConversations();
  const unread = (conversations.data ?? []).reduce((sum, row) => sum + row.unreadCount, 0);
  const name = profile?.full_name?.trim() ?? '';
  const campus = profile?.campus_location?.trim() ?? '';
  const approved = vendor?.status === 'approved';
  const roleLabel = profile?.role === 'admin' ? 'Admin' : approved ? 'Verified Vendor' : null;
  const tiles = [
    stats.orders != null ? { value: String(stats.orders), label: 'Orders' } : null,
    stats.listings != null ? { value: String(stats.listings), label: 'Listings' } : null,
    stats.active != null ? { value: String(stats.active), label: 'Active' } : null,
  ].filter((tile): tile is { value: string; label: string } => tile != null);

  const logOut = () => {
    Alert.alert('Log out', 'Log out of Campus Plug?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const support = () => {
    if (SUPPORT_URL) {
      void Linking.openURL(SUPPORT_URL);
      return;
    }
    Alert.alert('Support contact coming soon');
  };

  return (
    <Screen scroll>
      <PageHero
        actions={<ShellHeader actionsOnly variant="profile" />}
        highlight="Profile"
        subtitle="Manage your account, orders, and messages."
        title="Your Profile"
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={name} size="lg" uri={getImageUrl('avatars', profile?.avatar_url)} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          {name ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={typography.h1}>{name}</Text>
              {approved ? <Icon color="violet" name="badge-check" size={icon.sm} /> : null}
            </View>
          ) : null}
          {campus ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon color="lilac" name="map-pin" size={icon.sm} />
              <Text style={[typography.body, { color: colors.textMuted, flex: 1 }]}>{campus}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {tiles.length > 0 ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {tiles.map((tile, index) => (
              <View key={tile.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                {index > 0 ? (
                  <View style={{ width: layout.borderWidth, alignSelf: 'stretch', backgroundColor: colors.border }} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <StatTile label={tile.label} value={tile.value} />
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
      {roleLabel ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <Icon color="primary" name="crown" />
            <Badge label={roleLabel} tone="violet" />
          </View>
        </Card>
      ) : null}
      <ListRow
        icon="clipboard-check"
        onPress={() => router.push('/orders')}
        subtitle="View and track your orders"
        title="My Orders"
      />
      <ListRow
        badge={unread}
        icon="message-circle"
        onPress={() => router.push('/messages')}
        subtitle="Chat with vendors and buyers"
        title="Messages"
      />
      {vendor ? (
        <ListRow
          icon="store"
          onPress={() => router.push('/my-shop')}
          subtitle="Manage your shop"
          title="My Shop"
        />
      ) : null}
      {profile?.role === 'admin' ? (
        <ListRow
          icon="layout-dashboard"
          onPress={() => router.push('/dashboard')}
          subtitle="Review and moderate Campus Plug"
          title="Admin Dashboard"
        />
      ) : null}
      <ListRow icon="headphones" onPress={support} subtitle="Get help and contact us" title="Support" />
      <ListRow icon="log-out" onPress={logOut} subtitle="Sign out of this device" title="Log Out" />
    </Screen>
  );
}
