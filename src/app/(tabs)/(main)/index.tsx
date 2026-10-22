import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { CategoryRow, type CategoryChoice } from '@/components/marketplace/CategoryRow';
import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { PromoCarousel } from '@/components/marketplace/PromoCarousel';
import { VendorCard, VendorCardSkeleton } from '@/components/marketplace/VendorCard';
import { EmptyState } from '@/components/ui/EmptyState';
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
  const { vendor } = useAuth();
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
      <ShellHeader variant="home" />
      <PageHero
        highlight="campus"
        illustration="hero-piggy"
        subtitle="Find food, fashion, services and more from students and local vendors."
        title="Discover what's happening on campus"
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Search campus" onPress={openSearch}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
          <SearchBar onChangeText={() => undefined} onSubmit={openSearch} readOnly value="" />
        </View>
      </Pressable>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {vendorSkeletons.map((key) => (
            <VendorCardSkeleton key={key} />
          ))}
        </ScrollView>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
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
            />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
