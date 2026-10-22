import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import { OptionalMeta, productCountLabel, type OptionalMetaProps } from '@/components/marketplace/OptionalMeta';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, gradientAxis, gradients, icon, layout, marketplace, motion, radius, spacing, typography } from '@/constants/theme';

type VendorCardProps = OptionalMetaProps & {
  name: string;
  categoryLabel?: string | null;
  description?: string | null;
  productCount: number;
  coverUrl?: string | null;
  logoUrl?: string | null;
  isNew?: boolean;
  variant?: 'home' | 'explore';
  fill?: boolean;
  onPress: () => void;
};

export function VendorCard({
  name,
  categoryLabel,
  description,
  productCount,
  coverUrl,
  logoUrl,
  isNew = false,
  variant = 'home',
  fill = false,
  onPress,
  rating,
  reviewCount,
  distanceKm,
  wished,
  onToggleWishlist,
}: VendorCardProps) {
  const explore = variant === 'explore';
  const overlap = layout.minTouchTarget / 2;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => ({
        width: fill ? '100%' : marketplace.vendorCardWidth,
        opacity: pressed ? motion.pressedOpacity : 1,
      })}
    >
      <Card padded={false}>
        <View>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              contentFit="cover"
              accessibilityLabel=""
              style={{
                height: marketplace.coverHeight,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
              }}
            />
          ) : (
            <LinearGradient
              colors={gradients.banner}
              start={gradientAxis.start}
              end={gradientAxis.end}
              style={{
                height: marketplace.coverHeight,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar name={name} uri={logoUrl} />
            </LinearGradient>
          )}
          {isNew ? (
            <View style={{ position: 'absolute', top: spacing.sm, left: spacing.sm }}>
              <Badge label="New" tone="lime" />
            </View>
          ) : null}
          {explore ? (
            <View style={{ position: 'absolute', left: spacing.sm, bottom: -overlap }}>
              <Avatar name={name} uri={logoUrl} />
            </View>
          ) : null}
        </View>
        <View
          style={{
            padding: spacing.md,
            paddingTop: explore ? overlap + spacing.sm : spacing.md,
            paddingRight: layout.minTouchTarget,
            gap: spacing.xxs,
          }}
        >
          <Text numberOfLines={1} style={typography.h2}>
            {name}
          </Text>
          {categoryLabel ? (
            <Text numberOfLines={1} style={[typography.caption, { color: colors.lilac }]}>
              {categoryLabel}
            </Text>
          ) : null}
          <Text style={typography.caption}>{productCountLabel(productCount)}</Text>
          {description ? (
            <Text numberOfLines={3} style={typography.bodySmall}>
              {description}
            </Text>
          ) : null}
          <OptionalMeta
            rating={rating}
            reviewCount={reviewCount}
            distanceKm={distanceKm}
            wished={wished}
            onToggleWishlist={onToggleWishlist}
          />
        </View>
        <View
          accessibilityElementsHidden
          style={{
            position: 'absolute',
            right: spacing.sm,
            bottom: spacing.sm,
            width: layout.minTouchTarget,
            height: layout.minTouchTarget,
            borderRadius: radius.pill,
            backgroundColor: colors.indigo,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="chevron-right" size={icon.sm} color="textPrimary" />
        </View>
      </Card>
    </Pressable>
  );
}

export function VendorCardSkeleton({ fill = false }: { fill?: boolean }) {
  return (
    <View style={{ width: fill ? '100%' : marketplace.vendorCardWidth }}>
      <Skeleton height={marketplace.coverHeight + spacing.huge} rounded="xl" />
    </View>
  );
}
