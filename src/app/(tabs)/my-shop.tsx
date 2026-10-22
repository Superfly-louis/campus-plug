import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, Switch, Text, View } from 'react-native';

import { UnreadBadge } from '@/components/chat/UnreadBadge';
import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { PriceText } from '@/components/marketplace/PriceText';
import { StatusBanner } from '@/components/marketplace/StatusBanner';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { SUPPORT_URL } from '@/constants/config';
import { colors, marketplace, radius, spacing, typography } from '@/constants/theme';
import { useIncomingPendingCount } from '@/hooks/queries/useOrders';
import { useUpdateProduct, useVendorProducts } from '@/hooks/queries/useProducts';
import { useUpdateShop } from '@/hooks/queries/useVendors';
import { useAuth, type Vendor } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { getImageUrl } from '@/lib/images';
import type { Product } from '@/lib/api/products';

const productStatus: Record<Product['status'], { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'lime' },
  hidden: { label: 'Hidden', tone: 'violet' },
  removed_by_admin: { label: 'Removed by admin', tone: 'food' },
};

export default function MyShopScreen() {
  const { vendor, profileError, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);

  if (!vendor) return <Redirect href="/profile" />;

  async function refresh() {
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  }

  async function checkStatus() {
    setChecking(true);
    try {
      await refreshProfile();
    } finally {
      setChecking(false);
    }
  }

  if (vendor.status === 'approved') {
    return <ShopDashboard onRefresh={() => void refresh()} refreshing={refreshing} vendor={vendor} />;
  }

  const rejected = vendor.status === 'rejected';
  const removed = vendor.status === 'removed';
  const title = rejected
    ? 'Application not approved'
    : removed
      ? 'This shop was removed'
      : 'Application under review';

  return (
    <Screen onRefresh={() => void refresh()} refreshing={refreshing} scroll>
      <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
      <Text style={typography.h1}>{title}</Text>
      {vendor.status === 'pending' ? (
        <Text style={typography.body}>
          We are reviewing your shop. Pull to refresh, or check the status again.
        </Text>
      ) : null}
      {rejected && vendor.rejection_reason ? (
        <StatusBanner message={vendor.rejection_reason} tone="danger" />
      ) : null}
      {rejected || removed ? <SupportNote /> : null}
      {profileError ? <InlineError message={profileError} /> : null}
      {vendor.status === 'pending' ? (
        <Button label="Check status" loading={checking} onPress={() => void checkStatus()} />
      ) : null}
    </Screen>
  );
}

function SupportNote() {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={typography.body}>Contact support if you have a question about this decision.</Text>
      {SUPPORT_URL ? (
        <Button
          label="Contact support"
          onPress={() => void Linking.openURL(SUPPORT_URL)}
          variant="outline"
        />
      ) : null}
    </View>
  );
}

function ShopDashboard({
  vendor,
  refreshing,
  onRefresh,
}: {
  vendor: Vendor;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const products = useVendorProducts(vendor.id, 'owner');
  const incoming = useIncomingPendingCount();
  const updateShop = useUpdateShop();
  const updateProduct = useUpdateProduct();
  const [stock, setStock] = useState<Record<string, boolean>>({});
  const [stockError, setStockError] = useState<string | null>(null);
  const logoUrl = getImageUrl('shop-logos', vendor.logo_url);

  function refreshAll() {
    onRefresh();
    void products.refetch();
  }

  function setPaused(next: boolean) {
    if (next) {
      Alert.alert(
        'Pause this shop?',
        'Paused shops disappear for buyers. Your products stay saved until you open the shop again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pause', onPress: () => updateShop.mutate({ isPaused: true }) },
        ],
      );
      return;
    }
    updateShop.mutate({ isPaused: false });
  }

  function setInStock(product: Product, next: boolean) {
    setStockError(null);
    setStock((current) => ({ ...current, [product.id]: next }));
    updateProduct.mutate(
      { id: product.id, isAvailable: next },
      {
        onError: (error) => {
          setStock((current) => {
            const nextStock = { ...current };
            delete nextStock[product.id];
            return nextStock;
          });
          setStockError(toFriendlyError(error));
        },
        onSuccess: () => {
          setStock((current) => {
            const nextStock = { ...current };
            delete nextStock[product.id];
            return nextStock;
          });
        },
      },
    );
  }

  return (
    <Screen
      onRefresh={refreshAll}
      refreshing={refreshing || products.isRefetching}
      scroll
    >
      <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={vendor.shop_name} size="lg" uri={logoUrl ?? undefined} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={typography.h1}>{vendor.shop_name}</Text>
          <Badge label="Approved" tone="lime" />
        </View>
      </View>
      {vendor.description ? <Text style={typography.body}>{vendor.description}</Text> : null}
      {vendor.is_paused ? <StatusBanner message="This shop is paused" tone="warning" /> : null}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text style={typography.bodyMedium}>Pause shop</Text>
            <Text style={typography.bodySmall}>Buyers cannot see a paused shop or its products.</Text>
          </View>
          <Switch
            accessibilityLabel="Pause shop"
            disabled={updateShop.isPending}
            onValueChange={setPaused}
            thumbColor={colors.textPrimary}
            trackColor={{ false: colors.border, true: colors.primary }}
            value={vendor.is_paused}
          />
        </View>
      </Card>
      {updateShop.isError ? <InlineError message={toFriendlyError(updateShop.error)} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Incoming orders"
        onPress={() =>
          router.push({
            pathname: '/orders',
            params: { segment: 'incoming', focus: String(Date.now()) },
          })
        }
      >
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text style={typography.bodyMedium}>Incoming orders</Text>
              <Text style={typography.bodySmall}>Orders from buyers show up in Incoming.</Text>
            </View>
            <UnreadBadge count={incoming.data ?? 0} />
            <Icon color="periwinkle" name="chevron-right" />
          </View>
        </Card>
      </Pressable>
      <Button label="Edit shop" onPress={() => router.push('/vendor/edit-shop')} variant="secondary" />
      <Button label="Add product" onPress={() => router.push('/vendor/product-form')} />
      {stockError ? <InlineError message={stockError} /> : null}
      {products.isPending ? (
        <MarketplaceState status="loading" />
      ) : products.isError ? (
        <MarketplaceState
          message={toFriendlyError(products.error)}
          onRetry={() => {
            void products.refetch();
          }}
          status="error"
        />
      ) : (products.data ?? []).length === 0 ? (
        <MarketplaceState
          body="Add a product when you are ready to sell."
          icon="package"
          status="empty"
          title="Nothing listed yet"
        />
      ) : (
        (products.data ?? []).map((row) => {
          const cover = getImageUrl('product-images', row.images[0]?.storage_path);
          const status = productStatus[row.product.status];
          const inStock = stock[row.product.id] ?? row.product.is_available;
          const removed = row.product.status === 'removed_by_admin';
          return (
            <Card key={row.product.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${row.product.title}`}
                onPress={() =>
                  router.push({ pathname: '/vendor/product-form', params: { id: row.product.id } })
                }
              >
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <View
                    style={{
                      width: marketplace.miniImageHeight,
                      height: marketplace.miniImageHeight,
                      borderRadius: radius.lg,
                      overflow: 'hidden',
                      backgroundColor: colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {cover ? (
                      <Image source={{ uri: cover }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Icon color="lilac" name="package" />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text style={typography.bodyMedium}>{row.product.title}</Text>
                    <PriceText amount={row.product.price} />
                    <Badge label={status.label} tone={status.tone} />
                  </View>
                </View>
              </Pressable>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={typography.body}>In stock</Text>
                <Switch
                  accessibilityLabel={`In stock, ${row.product.title}`}
                  disabled={removed || updateProduct.isPending}
                  onValueChange={(next) => setInStock(row.product, next)}
                  thumbColor={colors.textPrimary}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  value={inStock}
                />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
