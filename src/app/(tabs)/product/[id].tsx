import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ImageCarousel } from '@/components/marketplace/ImageCarousel';
import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { PriceText } from '@/components/marketplace/PriceText';
import { OrderSheet } from '@/components/orders/OrderSheet';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { RefreshSpinner } from '@/components/ui/RefreshSpinner';
import { categoryVisual } from '@/constants/categories';
import { colors, layout, motion, radius, spacing, typography } from '@/constants/theme';
import { useOpenConversation } from '@/hooks/queries/useConversations';
import { useProduct } from '@/hooks/queries/useProducts';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { getImageUrl } from '@/lib/images';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function UnavailableProduct() {
  return (
    <Screen>
      <MarketplaceState
        actionLabel="Go back"
        body="It may have been hidden or removed."
        icon="package"
        onAction={() => router.back()}
        status="empty"
        title="This product isn't available"
      />
    </Screen>
  );
}

export default function ProductScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = param(params.id);
  const product = useProduct(id);
  const { session } = useAuth();
  const chat = useOpenConversation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const detail = product.data;

  if (!id || (!product.isPending && !product.isError && (!detail || detail.product.status !== 'active'))) {
    return <UnavailableProduct />;
  }

  if (product.isPending) {
    return (
      <Screen>
        <MarketplaceState status="loading" />
      </Screen>
    );
  }

  if (product.isError || !detail) {
    return (
      <Screen>
        <MarketplaceState
          message={toFriendlyError(product.error)}
          onRetry={() => {
            void product.refetch();
          }}
          status="error"
        />
      </Screen>
    );
  }

  const visual = detail.category ? categoryVisual(detail.category.slug, detail.category.name) : null;
  const photos = detail.images.flatMap((image) => {
    const url = getImageUrl('product-images', image.storage_path);
    return url ? [url] : [];
  });
  const ownsShop = detail.vendor.owner_id === session?.user.id;
  const unavailable = !detail.product.is_available;
  const paused = detail.vendor.is_paused;
  const blocked = ownsShop || unavailable || paused;
  const vendorId = detail.vendor.id;

  function startChat() {
    chat.mutate(vendorId, {
      onSuccess: (conversationId) => {
        router.push({ pathname: '/chat/[conversationId]', params: { conversationId } });
      },
    });
  }

  return (
    <Screen padded={false}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          refreshControl={
            <RefreshSpinner
              onRefresh={() => {
                void product.refetch();
              }}
              refreshing={product.isRefetching}
            />
          }
        >
          <View>
            <ImageCarousel accessibilityLabel={detail.product.title} images={photos} />
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => ({
                position: 'absolute',
                top: spacing.md,
                left: spacing.md,
                width: layout.minTouchTarget,
                height: layout.minTouchTarget,
                borderRadius: radius.pill,
                backgroundColor: colors.overlay,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? motion.pressedOpacity : 1,
              })}
            >
              <Icon color="textPrimary" name="chevron-left" />
            </Pressable>
          </View>
          <View style={{ padding: layout.screenPadding, gap: spacing.md }}>
            <Text style={typography.h1}>{detail.product.title}</Text>
            <PriceText amount={detail.product.price} />
            {visual ? <Badge label={visual.label} tone={visual.tone} /> : null}
            {detail.product.description ? <Text style={typography.body}>{detail.product.description}</Text> : null}
            <Pressable
              accessibilityLabel={`${detail.vendor.shop_name}. View shop`}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/shop/[id]', params: { id: detail.vendor.id } })}
              style={({ pressed }) => ({
                minHeight: layout.minTouchTarget,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                opacity: pressed ? motion.pressedOpacity : 1,
              })}
            >
              <Avatar name={detail.vendor.shop_name} uri={getImageUrl('shop-logos', detail.vendor.logo_url)} />
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text style={typography.bodyMedium}>{detail.vendor.shop_name}</Text>
                <Text style={[typography.caption, { color: colors.lilac }]}>View shop</Text>
              </View>
              <Icon color="periwinkle" name="chevron-right" />
            </Pressable>
            <Text style={typography.body}>{unavailable ? 'Currently unavailable' : 'In stock'}</Text>
          </View>
        </ScrollView>
        <View
          style={{
            gap: spacing.sm,
            paddingHorizontal: layout.screenPadding,
            paddingTop: spacing.md,
            paddingBottom: spacing.md,
            borderTopWidth: layout.borderWidth,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          {unavailable ? <Text style={typography.body}>Currently unavailable</Text> : null}
          {ownsShop ? <Text style={typography.body}>This is your listing</Text> : null}
          {paused ? <Text style={typography.body}>This shop is paused</Text> : null}
          {chat.isError ? <InlineError message={toFriendlyError(chat.error)} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <IconButton
              accessibilityLabel="Chat with this shop"
              disabled={blocked || chat.isPending}
              name="message-circle"
              onPress={startChat}
            />
            <View style={{ flex: 1 }}>
              <Button disabled={blocked} label="Order" onPress={() => setSheetOpen(true)} />
            </View>
          </View>
        </View>
        <OrderSheet
          items={[
            {
              productId: detail.product.id,
              quantity: 1,
              title: detail.product.title,
              unitPrice: detail.product.price,
            },
          ]}
          onClose={() => setSheetOpen(false)}
          onPlaced={(placed) => {
            setSheetOpen(false);
            router.push({ pathname: '/order/[id]', params: { id: placed.id } });
          }}
          vendorId={detail.vendor.id}
          visible={sheetOpen}
        />
      </View>
    </Screen>
  );
}
