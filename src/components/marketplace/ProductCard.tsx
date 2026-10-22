import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { OptionalMeta, type OptionalMetaProps } from '@/components/marketplace/OptionalMeta';
import { PriceText } from '@/components/marketplace/PriceText';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, marketplace, motion, radius, spacing, typography } from '@/constants/theme';

type ProductCardProps = OptionalMetaProps & {
  title: string;
  price: number;
  shopName: string;
  imageUrl?: string | null;
  categoryLabel?: string | null;
  categoryTone?: BadgeTone;
  onPress: () => void;
};

export function ProductCard(props: ProductCardProps) {
  return <ProductCardBody {...props} compact={false} />;
}

export function MiniProductCard(props: ProductCardProps) {
  return <ProductCardBody {...props} compact />;
}

function ProductCardBody({
  title,
  price,
  shopName,
  imageUrl,
  categoryLabel,
  categoryTone = 'violet',
  onPress,
  compact,
  rating,
  reviewCount,
  distanceKm,
  wished,
  onToggleWishlist,
}: ProductCardProps & { compact: boolean }) {
  const imageHeight = compact ? marketplace.miniImageHeight : marketplace.productImageHeight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${shopName}`}
      onPress={onPress}
      style={({ pressed }) => ({
        width: compact ? marketplace.miniCardWidth : '100%',
        opacity: pressed ? motion.pressedOpacity : 1,
      })}
    >
      <Card padded={false}>
        <View>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              contentFit="cover"
              style={{
                height: imageHeight,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
              }}
            />
          ) : (
            <View
              style={{
                height: imageHeight,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="package" color="lilac" />
            </View>
          )}
          {categoryLabel ? (
            <View style={{ position: 'absolute', left: spacing.sm, bottom: spacing.sm }}>
              <Badge label={categoryLabel} tone={categoryTone} />
            </View>
          ) : null}
        </View>
        <View style={{ padding: spacing.sm, gap: spacing.xxs }}>
          <Text numberOfLines={2} style={typography.bodyMedium}>
            {title}
          </Text>
          <PriceText amount={price} />
          <Text numberOfLines={1} style={typography.caption}>
            {shopName}
          </Text>
          <OptionalMeta
            rating={rating}
            reviewCount={reviewCount}
            distanceKm={distanceKm}
            wished={wished}
            onToggleWishlist={onToggleWishlist}
          />
        </View>
      </Card>
    </Pressable>
  );
}

export function ProductCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Skeleton
      height={(compact ? marketplace.miniImageHeight : marketplace.productImageHeight) + spacing.huge}
      width={compact ? marketplace.miniCardWidth : '100%'}
      rounded="xl"
    />
  );
}
