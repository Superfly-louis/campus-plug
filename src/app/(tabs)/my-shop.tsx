import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, Switch, Text, View } from 'react-native';

import { UnreadBadge } from '@/components/chat/UnreadBadge';
import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { PriceText } from '@/components/marketplace/PriceText';
import { StatusBanner } from '@/components/marketplace/StatusBanner';
import { PayoutAccountCard } from '@/components/shop/PayoutAccountCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { SUPPORT_URL, VERIFICATION_FEE_GHS } from '@/constants/config';
import { colors, marketplace, radius, spacing, typography } from '@/constants/theme';
import { useIncomingPendingCount } from '@/hooks/queries/useOrders';
import { usePaymentTerms } from '@/hooks/queries/usePayments';
import { useVendorCharges } from '@/hooks/queries/useCharges';
import { useUpdateProduct, useVendorProducts } from '@/hooks/queries/useProducts';
import { useUpdateShop } from '@/hooks/queries/useVendors';
import { startVerificationCheckout } from '@/lib/api/billing';
import type { Product } from '@/lib/api/products';
import { useAuth, type Vendor } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { owedPesewas, type VendorCharge } from '@/lib/api/charges';
import { formatOrderDate, formatPesewas, formatPrice } from '@/lib/format';
import { getImageUrl } from '@/lib/images';
import { useThemeMode } from '@/lib/themeMode';
import { shopIsVerified } from '@/lib/verification';

const productStatus: Record<Product['status'], { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'lime' },
  hidden: { label: 'Hidden', tone: 'violet' },
  removed_by_admin: { label: 'Removed by admin', tone: 'food' },
};

export default function MyShopScreen() {
  useThemeMode();
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
  useThemeMode();
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

function renewalFrom(verifiedUntil: string): string {
  const date = new Date(verifiedUntil);
  if (Number.isNaN(date.getTime())) return verifiedUntil;
  date.setUTCDate(date.getUTCDate() - 3);
  return date.toISOString();
}

const subscriptionsOpen = false;

function VerificationCard({ vendor, onRefresh }: { vendor: Vendor; onRefresh: () => void }) {
  useThemeMode();
  const verified = shopIsVerified(vendor);
  const inGrace = vendor.subscription_status === 'past_due' && verified;
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const awaiting = useRef(false);
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !awaiting.current) return;
      awaiting.current = false;
      setProcessing(true);
      refreshRef.current();
    });
    return () => subscription.remove();
  }, []);

  const fee = Number(VERIFICATION_FEE_GHS);
  const feeLabel =
    Number.isFinite(fee) && fee > 0 ? `Verify for ${formatPrice(fee)} a month` : 'Get verified';
  const renews = vendor.verified_until ? formatOrderDate(renewalFrom(vendor.verified_until)) : '';
  const graceUntil = vendor.verified_until ? formatOrderDate(vendor.verified_until) : '';

  async function subscribe() {
    setPayError(null);
    setBusy(true);
    try {
      const url = await startVerificationCheckout();
      awaiting.current = true;
      setProcessing(true);
      const result = await WebBrowser.openBrowserAsync(url);
      if (result.type !== 'opened') {
        awaiting.current = false;
        setProcessing(true);
        refreshRef.current();
      }
    } catch (error) {
      awaiting.current = false;
      setPayError(toFriendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        {verified && vendor.subscription_status === 'active' ? (
          <Text style={typography.body}>
            {renews ? `Buyers see your verified badge until ${renews}.` : 'Buyers see your verified badge.'}
          </Text>
        ) : null}
        {inGrace ? (
          <Text style={typography.body}>
            {graceUntil
              ? `Payment failed. Your badge stays until ${graceUntil}.`
              : 'Payment failed. Your badge stays for a few more days.'}
          </Text>
        ) : null}
        {!verified ? (
          <Text style={typography.body}>
            A monthly subscription adds the verified badge. Your shop stays listed either way.
          </Text>
        ) : null}
        {processing && !verified ? (
          <Text style={typography.bodySmall}>Payment is processing. Pull to refresh.</Text>
        ) : null}
        {payError ? <InlineError message={payError} /> : null}
        {!verified && !inGrace ? (
          <Button label={feeLabel} loading={busy} onPress={() => void subscribe()} />
        ) : null}
      </View>
    </Card>
  );
}

function CashCharges({
  charges,
  loading,
  percent,
}: {
  charges: readonly VendorCharge[];
  loading: boolean;
  percent: number | null;
}) {
  useThemeMode();
  const waiting = charges.filter((charge) => charge.status !== 'collected');
  const owed = owedPesewas(waiting);
  const percentLabel = percent == null ? null : Number.isInteger(percent) ? String(percent) : percent.toFixed(2);
  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <Text style={typography.h2}>Cash charges</Text>
        <Text style={typography.body}>
          {percentLabel
            ? `A ${percentLabel}% commission is recorded when a cash order is completed. It is taken from your next online payout. Buyers still pay the listed price.`
            : 'The commission is recorded when a cash order is completed. It is taken from your next online payout. Buyers still pay the listed price.'}
        </Text>
        {loading ? <Text style={typography.bodySmall}>Checking cash charges…</Text> : null}
        {!loading && owed > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <StatusBanner message="This comes out of your next online payout." tone="warning" />
            <Text style={[typography.display, { color: colors.warning }]}>{formatPesewas(owed)}</Text>
            <Text style={typography.bodyMedium}>
              {waiting.length === 1 ? '1 cash order is waiting.' : `${waiting.length} cash orders are waiting.`}
            </Text>
            {waiting.map((charge) => (
              <View
                key={charge.id}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}
              >
                <Text style={typography.body}>{formatOrderDate(charge.createdAt)}</Text>
                <Text style={typography.bodyMedium}>{formatPesewas(charge.amountPesewas)}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {!loading && owed === 0 ? (
          <Text style={typography.bodyMedium}>No cash charge is waiting.</Text>
        ) : null}
      </View>
    </Card>
  );
}

function OnlinePayments({
  vendor,
  percent,
}: {
  vendor: Vendor;
  percent: number | null;
}) {
  useThemeMode();
  const active = vendor.status === 'approved' && !vendor.is_paused;
  const percentLabel =
    percent == null ? null : Number.isInteger(percent) ? String(percent) : percent.toFixed(2);
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.bodyMedium}>{active ? 'Online payments: active' : 'Online payments: inactive'}</Text>
        {active ? (
          <Text style={typography.body}>
            {percentLabel
              ? `A ${percentLabel}% commission comes out of each online payout, along with Paystack's fee.`
              : "The commission comes out of each online payout, along with Paystack's fee."}
          </Text>
        ) : null}
      </View>
    </Card>
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
  useThemeMode();
  const products = useVendorProducts(vendor.id, 'owner');
  const incoming = useIncomingPendingCount();
  const terms = usePaymentTerms();
  const charges = useVendorCharges(vendor.id);
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            <Badge label="Approved" tone="lime" />
            {shopIsVerified(vendor) ? <Badge label="Verified" tone="violet" /> : null}
          </View>
        </View>
      </View>
      {vendor.description ? <Text style={typography.body}>{vendor.description}</Text> : null}
      {subscriptionsOpen ? <VerificationCard onRefresh={onRefresh} vendor={vendor} /> : null}
      <CashCharges charges={charges.data ?? []} loading={charges.isPending} percent={terms.data?.commissionPercent ?? null} />
      <OnlinePayments percent={terms.data?.commissionPercent ?? null} vendor={vendor} />
      <PayoutAccountCard />
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Campus requests"
        onPress={() => router.push({ pathname: '/requests', params: { segment: 'campus' } })}
      >
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text style={typography.bodyMedium}>Campus requests</Text>
              <Text style={typography.bodySmall}>See what people on your campus are looking for.</Text>
            </View>
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
