import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { CategoryRow } from '@/components/marketplace/CategoryRow';
import { FeaturedCard } from '@/components/marketplace/FeaturedCard';
import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { MiniProductCard, ProductCardSkeleton } from '@/components/marketplace/ProductCard';
import { PromoCarousel } from '@/components/marketplace/PromoCarousel';
import { VendorCard, VendorCardSkeleton } from '@/components/marketplace/VendorCard';
import { PageHero } from '@/components/ui/PageHero';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ShellHeader } from '@/components/ui/ShellHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { categoryVisual } from '@/constants/categories';
import { FEATURED_VENDOR_ID } from '@/constants/config';
import { marketplace, spacing } from '@/constants/theme';
import { useCategories } from '@/hooks/queries/useCategories';
import { useProductSearch, useVendorIdsInCategory } from '@/hooks/queries/useProducts';
import { useHomeVendors, useVendor } from '@/hooks/queries/useVendors';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { getImageUrl } from '@/lib/images';
import { sellEntry } from '@/lib/sell';

const previewSkeletons = ['one', 'two', 'three'] as const;

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function openShop(id: string) {
  router.push({ pathname: '/shop/[id]', params: { id } });
}

function openProduct(id: string) {
  router.push({ pathname: '/product/[id]', params: { id } });
}

export default function ExploreScreen() {
  const { vendor } = useAuth();
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const slug = param(params.category);
  const categories = useCategories();
  const home = useHomeVendors();
  const featured = useVendor(FEATURED_VENDOR_ID);
  const paramId = categories.data?.find((item) => item.slug === slug)?.id ?? null;
  const [override, setOverride] = useState<{ slug: string; id: string | null } | null>(null);
  const selectedId = override && override.slug === slug ? override.id : paramId;
  const selected = categories.data?.find((item) => item.id === selectedId) ?? null;
  const vendorIds = useVendorIdsInCategory(selectedId);
  const listed = useProductSearch({ categoryId: selectedId ?? undefined, sort: 'newest' });
  const hits = listed.data?.pages[0] ?? [];
  const vendorCards = selectedId
    ? home.cards.filter((card) => vendorIds.data?.includes(card.id))
    : home.cards;
  const vendorsPending = home.isPending || (Boolean(selectedId) && vendorIds.isPending);
  const vendorsError = home.isError || (Boolean(selectedId) && vendorIds.isError);
  const featuredCard = home.cards.find((card) => card.id === FEATURED_VENDOR_ID);
  const showFeatured =
    Boolean(featuredCard) && (!selectedId || Boolean(vendorIds.data?.includes(featuredCard?.id ?? '')));
  const refreshing =
    (categories.isRefetching || home.isRefetching || listed.isRefetching || vendorIds.isRefetching) &&
    !categories.isPending &&
    !home.isPending;

  return (
    <Screen
      onRefresh={() => {
        void categories.refetch();
        void home.refetch();
        void listed.refetch();
        if (selectedId) void vendorIds.refetch();
      }}
      refreshing={refreshing}
      scroll
    >
      <ShellHeader variant="explore" />
      <PageHero
        highlight2="Campus"
        illustration="hero-pin"
        subtitle="Find food, fashion, services and more from trusted vendors and fellow students."
        title="Explore"
        titleLine2="What's Around Campus"
      />
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
          onSelect={(category) => setOverride({ slug, id: category?.id ?? null })}
          selectedId={selectedId}
        />
      )}
      <PromoCarousel
        onExploreCategory={(next) => {
          const match = categories.data?.find((item) => item.slug === next);
          setOverride({ slug, id: match?.id ?? null });
        }}
        onStartSelling={() => sellEntry(vendor)}
      />
      <SectionHeader title="New Vendors" />
      {vendorsPending ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {previewSkeletons.map((key) => (
            <VendorCardSkeleton key={key} />
          ))}
        </ScrollView>
      ) : vendorsError ? (
        <MarketplaceState
          message={toFriendlyError(home.error ?? vendorIds.error)}
          onRetry={() => {
            void home.refetch();
            void vendorIds.refetch();
          }}
          status="error"
        />
      ) : vendorCards.length === 0 ? (
        <MarketplaceState
          body={selected ? `No shops in ${selected.name} yet.` : 'Approved shops show up here.'}
          icon="store"
          status="empty"
          title="No shops yet"
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {vendorCards.map((vendor) => (
            <VendorCard
              categoryLabel={vendor.categoryLabel}
              coverUrl={vendor.coverUrl}
              isNew={vendor.isNew}
              key={vendor.id}
              logoUrl={vendor.logoUrl}
              name={vendor.name}
              onPress={() => openShop(vendor.id)}
              productCount={vendor.productCount}
              variant="explore"
            />
          ))}
        </ScrollView>
      )}
      {showFeatured && featuredCard ? (
        <FeaturedCard
          categoryLabel={featuredCard.categoryLabel}
          coverUrl={featuredCard.coverUrl}
          description={featured.data?.description}
          id={featuredCard.id}
          logoUrl={featuredCard.logoUrl}
          name={featuredCard.name}
          onPress={() => openShop(featuredCard.id)}
          productCount={featuredCard.productCount}
        />
      ) : null}
      <SectionHeader
        icon="sparkles"
        onSeeAll={() =>
          router.push({
            pathname: '/search',
            params: selected ? { sort: 'newest', category: selected.slug } : { sort: 'newest' },
          })
        }
        title="Just Listed"
      />
      {listed.isPending ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {previewSkeletons.map((key) => (
            <ProductCardSkeleton compact key={key} />
          ))}
        </ScrollView>
      ) : listed.isError ? (
        <MarketplaceState
          message={toFriendlyError(listed.error)}
          onRetry={() => {
            void listed.refetch();
          }}
          status="error"
        />
      ) : hits.length === 0 ? (
        <MarketplaceState
          body={selected ? `Nothing listed in ${selected.name} yet.` : 'New products show up here.'}
          icon="package"
          status="empty"
          title="Nothing listed yet"
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {hits.map((hit) => {
            const match = categories.data?.find((item) => item.id === hit.categoryId);
            const visual = match ? categoryVisual(match.slug, match.name) : null;
            return (
              <MiniProductCard
                categoryLabel={visual?.label}
                categoryTone={visual?.tone}
                imageUrl={getImageUrl('product-images', hit.imagePath)}
                key={hit.id}
                onPress={() => openProduct(hit.id)}
                price={hit.price}
                shopName={hit.shopName}
                title={hit.title}
              />
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
