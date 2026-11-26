import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, Pressable, Text, View } from 'react-native';

import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { ProductCard, ProductCardSkeleton } from '@/components/marketplace/ProductCard';
import { ShopReviews } from '@/components/marketplace/ShopReviews';
import { StatusBanner } from '@/components/marketplace/StatusBanner';
import { VerifiedMark } from '@/components/marketplace/VerifiedMark';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { refreshControlFor } from '@/components/ui/RefreshSpinner';
import { useTabBarInset } from '@/components/ui/TabBar';
import { categoryVisual } from '@/constants/categories';
import { colors, control, gradientAxis, gradients, layout, marketplace, motion, radius, spacing, typography } from '@/constants/theme';
import { useOpenConversation } from '@/hooks/queries/useConversations';
import { useVendorProducts } from '@/hooks/queries/useProducts';
import { useVendor } from '@/hooks/queries/useVendors';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { getImageUrl } from '@/lib/images';
import { useThemeMode } from '@/lib/themeMode';
import { shopIsVerified } from '@/lib/verification';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function ShopScreen() {
  useThemeMode();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = param(params.id);
  const tabInset = useTabBarInset();
  const { session } = useAuth();
  const chat = useOpenConversation();
  const shop = useVendor(id);
  const paused = shop.data?.is_paused === true;
  const products = useVendorProducts(id, 'public', Boolean(shop.data) && !paused);
  const vendor = shop.data;

  if (!id || (!shop.isPending && !shop.isError && !vendor)) {
    return (
      <Screen>
        <MarketplaceState
          actionLabel="Go back"
          body="It may be closed or no longer on Campus Plug."
          icon="store"
          onAction={() => router.back()}
          status="empty"
          title="This shop isn't available"
        />
      </Screen>
    );
  }

  if (shop.isPending || !vendor) {
    return (
      <Screen>
        <MarketplaceState status="loading" />
      </Screen>
    );
  }

  if (shop.isError) {
    return (
      <Screen>
        <MarketplaceState
          message={toFriendlyError(shop.error)}
          onRetry={() => {
            void shop.refetch();
          }}
          status="error"
        />
      </Screen>
    );
  }

  const listings = paused || products.isPending || products.isError ? [] : (products.data ?? []);
  const coverPath = (products.data ?? []).find((item) => item.images[0]?.storage_path)?.images[0]?.storage_path;
  const coverUrl = getImageUrl('product-images', coverPath);
  const ownsShop = vendor.owner_id === session?.user.id;
  const blocked = ownsShop || paused;
  const vendorId = vendor.id;

  function messageShop() {
    chat.mutate(vendorId, {
      onSuccess: (conversationId) => {
        router.push({ pathname: '/chat/[conversationId]', params: { conversationId } });
      },
    });
  }

  return (
    <Screen>
      <FlatList contentInsetAdjustmentBehavior="never"
        columnWrapperStyle={listings.length > 0 ? { gap: spacing.sm } : undefined}
        contentContainerStyle={{ flexGrow: 1, gap: spacing.sm, paddingBottom: spacing.xl + tabInset }}
        data={listings}
        keyExtractor={(item) => item.product.id}
        numColumns={2}
        refreshControl={refreshControlFor({
          onRefresh: () => {
            void shop.refetch();
            if (!paused) void products.refetch();
          },
          refreshing: (shop.isRefetching || products.isRefetching) && !shop.isPending,
        })}
        renderItem={({ item }) => {
          const visual = item.category ? categoryVisual(item.category.slug, item.category.name) : null;
          const cover = item.images[0]?.storage_path;
          return (
            <View style={{ flex: 1 }}>
              <ProductCard
                categoryLabel={visual?.label}
                categoryTone={visual?.tone}
                imageUrl={getImageUrl('product-images', cover)}
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.product.id } })}
                price={item.product.price}
                shopName={vendor.shop_name}
                title={item.product.title}
              />
            </View>
          );
        }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
            <View>
              <View
                style={{
                  height: marketplace.featuredCover,
                  borderRadius: radius.xl,
                  overflow: 'hidden',
                  backgroundColor: colors.surfaceAlt,
                }}
              >
                {coverUrl ? (
                  <Image
                    accessibilityLabel=""
                    contentFit="cover"
                    source={{ uri: coverUrl }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <LinearGradient
                    colors={gradients.banner}
                    end={gradientAxis.end}
                    start={gradientAxis.start}
                    style={{ flex: 1 }}
                  />
                )}
              </View>
              <Pressable
                accessibilityLabel="Go back"
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  position: 'absolute',
                  top: spacing.sm,
                  left: spacing.sm,
                  width: layout.minTouchTarget,
                  height: layout.minTouchTarget,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surface,
                  opacity: pressed ? motion.pressedOpacity : 1,
                })}
              >
                <Icon color="textPrimary" name="chevron-left" />
              </Pressable>
              <View style={{ marginTop: -(control.avatarLg / 2), paddingLeft: spacing.md }}>
                <Avatar name={vendor.shop_name} size="lg" uri={getImageUrl('shop-logos', vendor.logo_url)} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text numberOfLines={2} style={[typography.h1, { flexShrink: 1 }]}>
                {vendor.shop_name}
              </Text>
              {shopIsVerified(vendor) ? <VerifiedMark /> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  disabled={blocked || chat.isPending}
                  label="Message"
                  loading={chat.isPending}
                  onPress={messageShop}
                  size="md"
                  variant="outline"
                />
              </View>
              {blocked ? null : (
                <View style={{ flex: 1 }}>
                  <Button
                    label="Request"
                    onPress={() =>
                      router.push({
                        pathname: '/requests',
                        params: { vendorId, shopName: vendor.shop_name },
                      })
                    }
                    size="md"
                    variant="secondary"
                  />
                </View>
              )}
            </View>
            {ownsShop ? <Text style={typography.body}>This is your listing</Text> : null}
            {vendor.description ? <Text style={typography.body}>{vendor.description}</Text> : null}
            <ShopReviews vendorId={vendor.id} />
            {paused ? <StatusBanner message="This shop is paused" tone="warning" /> : null}
            {chat.isError ? <InlineError message={toFriendlyError(chat.error)} /> : null}
          </View>
        }
        ListEmptyComponent={
          paused ? undefined : products.isPending ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <ProductCardSkeleton />
              </View>
              <View style={{ flex: 1 }}>
                <ProductCardSkeleton />
              </View>
            </View>
          ) : products.isError ? (
            <MarketplaceState
              message={toFriendlyError(products.error)}
              onRetry={() => {
                void products.refetch();
              }}
              status="error"
            />
          ) : (
            <MarketplaceState
              body="This shop has not listed anything for sale."
              icon="package"
              status="empty"
              title="Nothing listed yet"
            />
          )
        }
        style={{ flex: 1 }}
      />
    </Screen>
  );
}
