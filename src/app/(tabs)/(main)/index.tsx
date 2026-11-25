import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { CategoryRow, type CategoryChoice } from '@/components/marketplace/CategoryRow';
import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { PromoCarousel } from '@/components/marketplace/PromoCarousel';
import { VendorCard, VendorCardSkeleton } from '@/components/marketplace/VendorCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { PageHero } from '@/components/ui/PageHero';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ShellHeader } from '@/components/ui/ShellHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { marketplace, spacing } from '@/constants/theme';
import { useCategories } from '@/hooks/queries/useCategories';
import { useHomeVendors } from '@/hooks/queries/useVendors';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { sellEntry } from '@/lib/sell';

const vendorSkeletons = ['one', 'two', 'three'] as const;

function openSearch() {
  router.push('/search');
}

function openCategory(slug: string) {
  router.push({ pathname: '/explore', params: { category: slug } });
}

export default function HomeScreen() {
  const { profile, vendor } = useAuth();
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? '';
  const categories = useCategories();
  const home = useHomeVendors();
  const refreshing =
    (categories.isRefetching || home.isRefetching) && !categories.isPending && !home.isPending;

  return (
    <Screen
      onRefresh={() => {
        void categories.refetch();
        void home.refetch();
      }}
      refreshing={refreshing}
      scroll
    >
      <View style={{ gap: spacing.sm }}>
        <PageHero
          actions={<ShellHeader actionsOnly variant="home" />}
          highlight={firstName || undefined}
          title={firstName ? `Hey, ${firstName}` : 'Home'}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Search campus" onPress={openSearch}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
            <SearchBar onChangeText={() => undefined} onSubmit={openSearch} placeholder="Search campus" readOnly value="" />
          </View>
        </Pressable>
      </View>
      {categories.isPending ? (
        <Skeleton height={marketplace.categoryTileHeight} rounded="lg" />
      ) : categories.isError ? (
        <MarketplaceState
          message={toFriendlyError(categories.error)}
          onRetry={() => {
            void categories.refetch();
          }}
          status="error"
        />
      ) : (
        <CategoryRow
          categories={categories.data ?? []}
          onSelect={(category: CategoryChoice | null) => {
            if (category) openCategory(category.slug);
          }}
        />
      )}
      <PromoCarousel onExploreCategory={openCategory} onStartSelling={() => sellEntry(vendor)} />
      <SectionHeader
        onSeeAll={home.cards.length > 0 ? () => router.push('/vendors') : undefined}
        title="Popular Vendors"
      />
      {home.isPending ? (
        <HorizontalScroll contentContainerStyle={{ gap: spacing.sm }}>
          {vendorSkeletons.map((key) => (
            <VendorCardSkeleton key={key} />
          ))}
        </HorizontalScroll>
      ) : home.isError ? (
        <MarketplaceState
          message={toFriendlyError(home.error)}
          onRetry={() => {
            void home.refetch();
          }}
          status="error"
        />
      ) : home.cards.length === 0 ? (
        <EmptyState
          actionLabel="Be the first to sell"
          body="Approved shops show up here. A paused shop stays hidden until it opens again."
          icon="store"
          onAction={() => sellEntry(vendor)}
          title="Nothing listed yet"
        />
      ) : (
        <HorizontalScroll contentContainerStyle={{ gap: spacing.sm }}>
          {home.cards.map((vendor) => (
            <VendorCard
              categoryLabel={vendor.categoryLabel}
              coverUrl={vendor.coverUrl}
              isNew={vendor.isNew}
              key={vendor.id}
              logoUrl={vendor.logoUrl}
              name={vendor.name}
              onPress={() => router.push({ pathname: '/shop/[id]', params: { id: vendor.id } })}
              productCount={vendor.productCount}
              rating={vendor.rating}
              reviewCount={vendor.reviewCount}
              verified={vendor.verified}
            />
          ))}
        </HorizontalScroll>
      )}
    </Screen>
  );
}
