import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RequestComposer } from '@/components/requests/RequestComposer';
import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { IconButton } from '@/components/ui/IconButton';
import { PageHero } from '@/components/ui/PageHero';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/orders/SegmentedControl';
import { categoryVisual } from '@/constants/categories';
import { limits, motion, spacing, typography } from '@/constants/theme';
import { useCategories } from '@/hooks/queries/useCategories';
import { useCampusRequests, useMyRequests } from '@/hooks/queries/useRequests';
import type { BuyerRequest } from '@/lib/api/requests';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { formatOrderDate } from '@/lib/format';
import { useThemeMode } from '@/lib/themeMode';

type Area = 'mine' | 'campus';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function offerLabel(count: number): string {
  return count === 1 ? '1 offer' : `${count} offers`;
}

function RequestCard({ item, onPress }: { item: BuyerRequest; onPress: () => void }) {
  useThemeMode();
  const category = categoryVisual(item.categorySlug, item.categoryName).label;
  const audience = item.targetShopName ? `For ${item.targetShopName}` : 'For anyone on campus';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? motion.pressedOpacity : 1 })}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text numberOfLines={2} style={[typography.bodyMedium, { flex: 1 }]}>
            {item.title}
          </Text>
          {item.mine && item.status === 'open' ? <Badge label="You" tone="violet" /> : null}
          {item.status === 'closed' ? <Badge label="Closed" tone="violet" /> : null}
          {item.status === 'removed' ? <Badge label="Removed" tone="food" /> : null}
        </View>
        <Text style={typography.body}>
          {item.buyerName} · {category}
        </Text>
        <Text style={typography.caption}>
          {audience} · {offerLabel(item.offerCount)} · {formatOrderDate(item.createdAt)}
        </Text>
      </Card>
    </Pressable>
  );
}

export default function RequestsScreen() {
  useThemeMode();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{
    vendorId?: string | string[];
    shopName?: string | string[];
    segment?: string | string[];
  }>();
  const vendorId = param(params.vendorId);
  const shopName = param(params.shopName);
  const segment = param(params.segment);
  const [area, setArea] = useState<Area>(segment === 'campus' ? 'campus' : 'mine');
  const [seenSegment, setSeenSegment] = useState(segment);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [compose, setCompose] = useState(false);
  const [composeKey, setComposeKey] = useState(0);
  const [openedFor, setOpenedFor] = useState('');
  if (segment !== seenSegment) {
    setSeenSegment(segment);
    if (segment === 'campus') setArea('campus');
  }
  if (vendorId && vendorId !== openedFor) {
    setOpenedFor(vendorId);
    setComposeKey((value) => value + 1);
    setCompose(true);
  }
  const categories = useCategories();
  const mine = useMyRequests();
  const campus = useCampusRequests(categoryId);
  const campusName = profile?.campus_location?.trim() ?? '';
  const openCount = (mine.data ?? []).filter((row) => row.status === 'open').length;
  const atCap = openCount >= limits.openRequestMax;
  const active = area === 'mine' ? mine : campus;
  const rows = active.data ?? [];

  function openComposer() {
    setComposeKey((value) => value + 1);
    setCompose(true);
  }

  function open(id: string) {
    router.push({ pathname: '/requests/[id]', params: { id } });
  }

  return (
    <Screen
      onRefresh={() => {
        void mine.refetch();
        void campus.refetch();
        void categories.refetch();
      }}
      refreshing={(mine.isRefetching || campus.isRefetching) && !mine.isPending && !campus.isPending}
      scroll
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
        <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <PageHero
            highlight="Requests"
            subtitle="Ask your campus for something a shop has not listed."
            title="Your Requests"
          />
        </View>
      </View>
      {atCap ? (
        <Text style={typography.body}>You already have 3 open requests. Close one before posting another.</Text>
      ) : (
        <Button label="Post a request" onPress={openComposer} />
      )}
      <SegmentedControl
        onChange={setArea}
        options={[
          { value: 'mine', label: 'Mine' },
          { value: 'campus', label: 'Campus' },
        ]}
        value={area}
      />
      {area === 'campus' ? (
        <HorizontalScroll contentContainerStyle={{ gap: spacing.xs }}>
          <Chip active={categoryId === null} label="All" onPress={() => setCategoryId(null)} />
          {(categories.data ?? []).map((category) => {
            const visual = categoryVisual(category.slug, category.name);
            return (
              <Chip
                active={categoryId === category.id}
                key={category.id}
                label={visual.label}
                onPress={() => setCategoryId(category.id)}
              />
            );
          })}
        </HorizontalScroll>
      ) : null}
      {active.isPending ? (
        <MarketplaceState status="loading" />
      ) : active.isError ? (
        <MarketplaceState
          message={toFriendlyError(active.error)}
          onRetry={() => {
            void active.refetch();
          }}
          status="error"
        />
      ) : rows.length === 0 ? (
        area === 'campus' && !campusName ? (
          <MarketplaceState
            actionLabel="Settings"
            body="Add your campus before the board can show requests."
            icon="map-pin"
            onAction={() => router.push('/settings')}
            status="empty"
            title="Campus needed"
          />
        ) : (
          <MarketplaceState
            body={
              area === 'mine'
                ? 'Post what you need and people on your campus can see it.'
                : `No open requests on ${campusName} right now.`
            }
            icon="shopping-bag"
            status="empty"
            title={area === 'mine' ? 'No requests yet' : 'Nothing on the board'}
          />
        )
      ) : (
        rows.map((item) => <RequestCard item={item} key={item.id} onPress={() => open(item.id)} />)
      )}
      <RequestComposer
        initialShopName={shopName}
        initialVendorId={vendorId}
        key={composeKey}
        onClose={() => setCompose(false)}
        onCreated={(id) => {
          setCompose(false);
          open(id);
        }}
        visible={compose}
      />
    </Screen>
  );
}
