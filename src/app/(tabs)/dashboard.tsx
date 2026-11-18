import { Redirect, router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, FlatList, ScrollView, Text, View } from 'react-native';

import { AuditEntryCard } from '@/components/admin/AuditEntryCard';
import { ProductModerationCard } from '@/components/admin/ProductModerationCard';
import { VendorReviewCard } from '@/components/admin/VendorReviewCard';
import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { SegmentedControl } from '@/components/orders/SegmentedControl';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { RefreshSpinner } from '@/components/ui/RefreshSpinner';
import { useTabBarInset } from '@/components/ui/TabBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, limits, spacing, typography } from '@/constants/theme';
import { useAdminProducts, useAdminVendors, useAuditLog, useModerateProduct, useRemoveVendor, useReviewVendor } from '@/hooks/queries/useAdmin';
import type { AdminProduct, AdminProductStatus, AdminVendor } from '@/lib/api/admin';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { getImageUrl } from '@/lib/images';

type Area = 'shops' | 'products' | 'audit';
type Queue = 'pending' | 'approved';

const productFilters: readonly { value: AdminProductStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'removed_by_admin', label: 'Removed' },
];

const productEmpty: Record<AdminProductStatus, { title: string; body: string }> = {
  all: { title: 'No products', body: 'Products you can moderate will show up here.' },
  active: { title: 'No active products', body: 'Active listings will show up here.' },
  hidden: { title: 'No hidden products', body: 'Hidden listings will show up here.' },
  removed_by_admin: { title: 'No removed products', body: 'Products removed by an admin will show up here.' },
};

export default function DashboardScreen() {
  const tabInset = useTabBarInset();
  const { profile } = useAuth();
  const [area, setArea] = useState<Area>('shops');
  const [queue, setQueue] = useState<Queue>('pending');
  const [productFilter, setProductFilter] = useState<AdminProductStatus>('all');
  const shops = useAdminVendors(queue, area === 'shops');
  const products = useAdminProducts(productFilter, area === 'products');
  const audit = useAuditLog(area === 'audit');
  const review = useReviewVendor();
  const remove = useRemoveVendor();
  const moderate = useModerateProduct();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const shopRows = shops.data?.pages.flat() ?? [];
  const productRows = products.data?.pages.flat() ?? [];
  const auditRows = audit.data?.pages.flat() ?? [];
  const showShops = !shops.isPending && !shops.isError;
  const showProducts = !products.isPending && !products.isError;
  const showAudit = !audit.isPending && !audit.isError;
  const busy = review.isPending || remove.isPending || moderate.isPending;
  const reviewing = queue === 'pending';

  function clearAction() {
    setRejectingId(null);
    setReason('');
    setError(null);
  }

  function selectArea(next: Area) {
    setArea(next);
    clearAction();
  }

  function selectQueue(next: Queue) {
    setQueue(next);
    clearAction();
  }

  function selectProductFilter(next: AdminProductStatus) {
    setProductFilter(next);
    clearAction();
  }

  function approve(shop: AdminVendor) {
    Alert.alert('Approve this shop?', `${shop.shopName} will be able to sell.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () => {
          setError(null);
          review.mutate(
            { vendorId: shop.id, decision: 'approved', reason: '' },
            {
              onSuccess: () => {
                if (rejectingId === shop.id) clearAction();
              },
              onError: (caught) => setError(toFriendlyError(caught)),
            },
          );
        },
      },
    ]);
  }

  function confirmReject(shop: AdminVendor) {
    setError(null);
    review.mutate(
      { vendorId: shop.id, decision: 'rejected', reason },
      {
        onSuccess: () => clearAction(),
        onError: (caught) => setError(toFriendlyError(caught)),
      },
    );
  }

  function confirmRemove(shop: AdminVendor) {
    setError(null);
    remove.mutate(
      { vendorId: shop.id, reason },
      {
        onSuccess: () => clearAction(),
        onError: (caught) => setError(toFriendlyError(caught)),
      },
    );
  }

  function changeProduct(product: AdminProduct, status: 'active' | 'hidden') {
    const hiding = status === 'hidden';
    Alert.alert(
      hiding ? 'Hide this product?' : 'Show this product?',
      hiding ? 'Buyers will no longer see it.' : 'Buyers can see it again when the shop is open.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: hiding ? 'Hide' : 'Show',
          onPress: () => {
            setError(null);
            moderate.mutate(
              { productId: product.id, status, reason: '' },
              {
                onSuccess: () => {
                  if (rejectingId === product.id) clearAction();
                },
                onError: (caught) => setError(toFriendlyError(caught)),
              },
            );
          },
        },
      ],
    );
  }

  function confirmRemoveProduct(product: AdminProduct) {
    setError(null);
    moderate.mutate(
      { productId: product.id, status: 'removed_by_admin', reason },
      {
        onSuccess: () => clearAction(),
        onError: (caught) => setError(toFriendlyError(caught)),
      },
    );
  }

  function startAction(id: string) {
    setRejectingId(id);
    setReason('');
    setError(null);
  }

  if (profile?.role !== 'admin') return <Redirect href="/" />;

  const heading = (below: ReactNode) => (
    <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
        <Text style={typography.h1}>Admin</Text>
      </View>
      <ScrollView horizontal contentContainerStyle={{ gap: spacing.xs }} showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        {(
          [
            { value: 'shops', label: 'Shops' },
            { value: 'products', label: 'Products' },
            { value: 'audit', label: 'Audit' },
          ] as const
        ).map((item) => (
          <Chip active={item.value === area} key={item.value} label={item.label} onPress={() => selectArea(item.value)} />
        ))}
      </ScrollView>
      {below}
      {error ? <InlineError message={error} /> : null}
    </View>
  );

  if (area === 'audit') {
    return (
      <Screen>
        <FlatList contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ flexGrow: 1, gap: spacing.sm, paddingBottom: spacing.xl + tabInset }}
          data={showAudit ? auditRows : []}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          onEndReached={() => {
            if (audit.hasNextPage && !audit.isFetchingNextPage) void audit.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshSpinner
              onRefresh={() => {
                void audit.refetch();
              }}
              refreshing={audit.isRefetching && !audit.isFetchingNextPage}
            />
          }
          ListHeaderComponent={heading(null)}
          ListEmptyComponent={
            audit.isPending ? (
              <MarketplaceState status="loading" />
            ) : audit.isError ? (
              <MarketplaceState
                message={toFriendlyError(audit.error)}
                onRetry={() => {
                  void audit.refetch();
                }}
                status="error"
              />
            ) : (
              <MarketplaceState
                body="Approvals, removals, and product changes will show up here."
                icon="clipboard-check"
                status="empty"
                title="No admin activity"
              />
            )
          }
          ListFooterComponent={audit.isFetchingNextPage ? <Skeleton height={spacing.huge} rounded="lg" /> : undefined}
          renderItem={({ item }) => <AuditEntryCard entry={item} when={formatDateTime(item.createdAt)} />}
        />
      </Screen>
    );
  }

  if (area === 'products') {
    const empty = productEmpty[productFilter];
    return (
      <Screen>
        <FlatList contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ flexGrow: 1, gap: spacing.sm, paddingBottom: spacing.xl + tabInset }}
          data={showProducts ? productRows : []}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          onEndReached={() => {
            if (products.hasNextPage && !products.isFetchingNextPage) void products.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshSpinner
              onRefresh={() => {
                void products.refetch();
              }}
              refreshing={products.isRefetching && !products.isFetchingNextPage}
            />
          }
          ListHeaderComponent={heading(
            <ScrollView
              horizontal
              contentContainerStyle={{ gap: spacing.xs }}
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
            >
              {productFilters.map((filter) => (
                <Chip
                  active={filter.value === productFilter}
                  key={filter.value}
                  label={filter.label}
                  onPress={() => selectProductFilter(filter.value)}
                />
              ))}
            </ScrollView>,
          )}
          ListEmptyComponent={
            products.isPending ? (
              <MarketplaceState status="loading" />
            ) : products.isError ? (
              <MarketplaceState
                message={toFriendlyError(products.error)}
                onRetry={() => {
                  void products.refetch();
                }}
                status="error"
              />
            ) : (
              <MarketplaceState body={empty.body} icon="package" status="empty" title={empty.title} />
            )
          }
          ListFooterComponent={products.isFetchingNextPage ? <Skeleton height={spacing.huge} rounded="lg" /> : undefined}
          renderItem={({ item }) => (
            <ProductModerationCard
              busy={busy}
              listed={formatDateTime(item.createdAt)}
              onConfirmRemove={() => confirmRemoveProduct(item)}
              onHide={() => changeProduct(item, 'hidden')}
              onReasonChange={(value) => setReason(value.slice(0, limits.moderationReasonMax))}
              onShow={() => changeProduct(item, 'active')}
              onStartRemove={() => startAction(item.id)}
              product={item}
              reason={rejectingId === item.id ? reason : ''}
              removing={rejectingId === item.id}
            />
          )}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ flexGrow: 1, gap: spacing.sm, paddingBottom: spacing.xl + tabInset }}
        data={showShops ? shopRows : []}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        onEndReached={() => {
          if (shops.hasNextPage && !shops.isFetchingNextPage) void shops.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshSpinner
            onRefresh={() => {
              void shops.refetch();
            }}
            refreshing={shops.isRefetching && !shops.isFetchingNextPage}
          />
        }
        ListHeaderComponent={heading(
          <View style={{ gap: spacing.sm }}>
            <SegmentedControl
              onChange={selectQueue}
              options={[
                { value: 'pending', label: 'Applications' },
                { value: 'approved', label: 'Approved' },
              ]}
              value={queue}
            />
            {reviewing ? null : (
              <Text style={[typography.body, { color: colors.textMuted }]}>
                Removing a shop hides its products. A vendor account returns to a buyer. An admin who also owns the shop stays an admin.
              </Text>
            )}
          </View>,
        )}
        ListEmptyComponent={
          shops.isPending ? (
            <MarketplaceState status="loading" />
          ) : shops.isError ? (
            <MarketplaceState
              message={toFriendlyError(shops.error)}
              onRetry={() => {
                void shops.refetch();
              }}
              status="error"
            />
          ) : (
            <MarketplaceState
              body={reviewing ? 'New shop applications will show up here.' : 'Approved shops you can remove will show up here.'}
              icon="store"
              status="empty"
              title={reviewing ? 'No shops waiting' : 'No approved shops'}
            />
          )
        }
        ListFooterComponent={shops.isFetchingNextPage ? <Skeleton height={spacing.huge} rounded="lg" /> : undefined}
        renderItem={({ item }) => (
          <VendorReviewCard
            applied={formatDateTime(item.createdAt)}
            busy={busy}
            mode={reviewing ? 'review' : 'remove'}
            onApprove={reviewing ? () => approve(item) : undefined}
            onConfirmReject={() => (reviewing ? confirmReject(item) : confirmRemove(item))}
            onReasonChange={(value) => setReason(value.slice(0, limits.moderationReasonMax))}
            onStartReject={() => startAction(item.id)}
            ownerPhoto={getImageUrl('avatars', item.ownerAvatarUrl)}
            reason={rejectingId === item.id ? reason : ''}
            rejecting={rejectingId === item.id}
            shop={item}
            shopPhoto={getImageUrl('shop-logos', item.logoUrl)}
          />
        )}
      />
    </Screen>
  );
}
