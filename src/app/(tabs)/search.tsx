import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { ProductCard, ProductCardSkeleton } from '@/components/marketplace/ProductCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { RefreshSpinner } from '@/components/ui/RefreshSpinner';
import { useTabBarInset } from '@/components/ui/TabBar';
import { SearchBar } from '@/components/ui/SearchBar';
import { TextField } from '@/components/ui/TextField';
import { categoryVisual } from '@/constants/categories';
import { colors, layout, marketplace, motion, radius, spacing, typography } from '@/constants/theme';
import { useCategories } from '@/hooks/queries/useCategories';
import { useProductSearch } from '@/hooks/queries/useProducts';
import { toFriendlyError } from '@/lib/errors';
import { getImageUrl } from '@/lib/images';
import { filterPriceSchema } from '@/lib/validation';
import type { ProductSort } from '@/lib/api/products';

const sorts = ['newest', 'price_asc', 'price_desc', 'relevance'] as const;

const sortLabels: Record<ProductSort, string> = {
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  relevance: 'Relevance',
};

type AppliedFilters = {
  token: string;
  sort: ProductSort;
  categoryId: string | null;
  minPrice?: number;
  maxPrice?: number;
};

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function isSort(value: string): value is ProductSort {
  return (sorts as readonly string[]).includes(value);
}

function filterCount(filters: { categoryId: string | null; minPrice?: number; maxPrice?: number; sort: ProductSort }) {
  let count = 0;
  if (filters.categoryId) count += 1;
  if (filters.minPrice != null) count += 1;
  if (filters.maxPrice != null) count += 1;
  if (filters.sort !== 'newest') count += 1;
  return count;
}

export default function SearchScreen() {
  const tabInset = useTabBarInset();
  const params = useLocalSearchParams<{ sort?: string | string[]; category?: string | string[] }>();
  const slug = param(params.category);
  const sortParam = param(params.sort);
  const paramSort: ProductSort = isSort(sortParam) ? sortParam : 'newest';
  const incoming = `${paramSort}|${slug}`;
  const categories = useCategories();
  const resolvedCategoryId = categories.data?.find((item) => item.slug === slug)?.id ?? null;
  const [seenToken, setSeenToken] = useState(incoming);
  const [applied, setApplied] = useState<AppliedFilters | null>(null);
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const reset = seenToken !== incoming;
  if (reset) {
    setSeenToken(incoming);
    setApplied(null);
    setText('');
    setDebounced('');
  }

  const active = reset ? null : applied;
  const sort: ProductSort = active?.token === incoming ? active.sort : paramSort;
  const categoryId = active?.token === incoming ? active.categoryId : resolvedCategoryId;
  const minPrice = active?.token === incoming ? active.minPrice : undefined;
  const maxPrice = active?.token === incoming ? active.maxPrice : undefined;
  const queryText = reset ? '' : debounced;
  const waitingForCategory = slug.length > 0 && categoryId == null && categories.isPending;
  const results = useProductSearch(
    { q: queryText, categoryId: categoryId ?? undefined, minPrice, maxPrice, sort },
    !waitingForCategory && !(slug.length > 0 && categories.isError),
  );
  const hits = results.data?.pages.flat() ?? [];
  const count = filterCount({ categoryId, minPrice, maxPrice, sort });

  const [open, setOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState<string | null>(null);
  const [draftMin, setDraftMin] = useState('');
  const [draftMax, setDraftMax] = useState('');
  const [draftSort, setDraftSort] = useState<ProductSort>('newest');
  const [formError, setFormError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), marketplace.searchDebounceMs);
    return () => clearTimeout(timer);
  }, [text]);

  function openFilters() {
    setDraftCategory(categoryId);
    setDraftMin(minPrice == null ? '' : String(minPrice));
    setDraftMax(maxPrice == null ? '' : String(maxPrice));
    setDraftSort(sort);
    setFormError(null);
    setOpen(true);
  }

  function applyFilters() {
    const parsedMin = filterPriceSchema.safeParse(draftMin);
    const parsedMax = filterPriceSchema.safeParse(draftMax);
    if (!parsedMin.success) {
      setFormError(parsedMin.error.issues[0]?.message ?? 'Check the minimum price.');
      return;
    }
    if (!parsedMax.success) {
      setFormError(parsedMax.error.issues[0]?.message ?? 'Check the maximum price.');
      return;
    }
    if (parsedMin.data != null && parsedMax.data != null && parsedMin.data > parsedMax.data) {
      setFormError('Minimum price cannot exceed maximum price.');
      return;
    }
    setApplied({
      token: incoming,
      sort: draftSort,
      categoryId: draftCategory,
      minPrice: parsedMin.data,
      maxPrice: parsedMax.data,
    });
    setOpen(false);
  }

  function clearFilters() {
    setApplied({ token: incoming, sort: 'newest', categoryId: null });
    setOpen(false);
  }

  const minFieldError = filterPriceSchema.safeParse(draftMin).success ? null : 'Enter a valid minimum price.';
  const maxFieldError = filterPriceSchema.safeParse(draftMax).success ? null : 'Enter a valid maximum price.';

  return (
    <Screen>
      <FlatList contentInsetAdjustmentBehavior="never"
        columnWrapperStyle={hits.length > 0 ? { gap: spacing.sm } : undefined}
        contentContainerStyle={{ flexGrow: 1, gap: spacing.sm, paddingBottom: spacing.xl + tabInset }}
        data={results.isPending || results.isError ? [] : hits}
        keyExtractor={(hit) => hit.id}
        numColumns={2}
        onEndReached={() => {
          if (results.hasNextPage && !results.isFetchingNextPage) void results.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshSpinner
            onRefresh={() => {
              void results.refetch();
            }}
            refreshing={results.isRefetching && !results.isPending}
          />
        }
        renderItem={({ item }) => {
          const match = categories.data?.find((category) => category.id === item.categoryId);
          const visual = match ? categoryVisual(match.slug, match.name) : null;
          return (
            <View style={{ flex: 1 }}>
              <ProductCard
                categoryLabel={visual?.label}
                categoryTone={visual?.tone}
                imageUrl={getImageUrl('product-images', item.imagePath)}
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
                price={item.price}
                shopName={item.shopName}
                title={item.title}
              />
            </View>
          );
        }}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
              <View style={{ flex: 1 }}>
                <SearchBar
                  autoFocus
                  onChangeText={setText}
                  onSubmit={() => setDebounced(text)}
                  value={reset ? '' : text}
                />
              </View>
              <Pressable
                accessibilityLabel={count > 0 ? `Filters, ${count} active` : 'Filters'}
                accessibilityRole="button"
                onPress={openFilters}
                style={({ pressed }) => ({
                  width: layout.minTouchTarget,
                  height: layout.minTouchTarget,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? motion.pressedOpacity : 1,
                })}
              >
                <Icon color="lilac" name="sliders-horizontal" />
                {count > 0 ? (
                  <View style={{ position: 'absolute', top: -spacing.xxs, right: -spacing.xxs }}>
                    <Badge label={String(count)} tone="lime" />
                  </View>
                ) : null}
              </Pressable>
            </View>
            {count > 0 ? (
              <Pressable accessibilityRole="button" onPress={clearFilters}>
                <Text style={[typography.bodyMedium, { color: colors.lilac }]}>Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          waitingForCategory || results.isPending ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <View style={{ width: '47%' }}>
                <ProductCardSkeleton />
              </View>
              <View style={{ width: '47%' }}>
                <ProductCardSkeleton />
              </View>
            </View>
          ) : results.isError || categories.isError ? (
            <MarketplaceState
              message={toFriendlyError(results.error ?? categories.error)}
              onRetry={() => {
                void results.refetch();
                void categories.refetch();
              }}
              status="error"
            />
          ) : (
            <MarketplaceState
              body="Try another word, category, or price."
              icon="search"
              status="empty"
              title="Nothing matches"
            />
          )
        }
        ListFooterComponent={
          results.isFetchingNextPage ? (
            <View style={{ paddingVertical: spacing.md }}>
              <ProductCardSkeleton />
            </View>
          ) : undefined
        }
        style={{ flex: 1 }}
      />
      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable accessibilityLabel="Close filters" onPress={() => setOpen(false)} style={{ flex: 1 }} />
          <View
            style={{
              maxHeight: '85%',
              backgroundColor: colors.background,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              gap: spacing.md,
            }}
          >
            <Text style={typography.h2}>Filters</Text>
            <ScrollView contentContainerStyle={{ gap: spacing.md }}>
              <Text style={typography.bodyMedium}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <Chip active={draftCategory == null} label="All" onPress={() => setDraftCategory(null)} />
                {(categories.data ?? []).map((category) => {
                  const visual = categoryVisual(category.slug, category.name);
                  return (
                    <Chip
                      active={draftCategory === category.id}
                      key={category.id}
                      label={visual.label}
                      onPress={() => setDraftCategory(category.id)}
                    />
                  );
                })}
              </View>
              <TextField
                error={draftMin.length > 0 ? (minFieldError ?? undefined) : undefined}
                keyboardType="decimal-pad"
                label="Minimum price"
                onChangeText={setDraftMin}
                placeholder="0"
                value={draftMin}
              />
              <TextField
                error={draftMax.length > 0 ? (maxFieldError ?? undefined) : undefined}
                keyboardType="decimal-pad"
                label="Maximum price"
                onChangeText={setDraftMax}
                placeholder="100"
                value={draftMax}
              />
              <Text style={typography.bodyMedium}>Sort</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {sorts.map((option) => (
                  <Chip
                    active={draftSort === option}
                    key={option}
                    label={sortLabels[option]}
                    onPress={() => setDraftSort(option)}
                  />
                ))}
              </View>
              {formError ? <InlineError message={formError} /> : null}
            </ScrollView>
            <Button label="Apply filters" onPress={applyFilters} />
            <Button label="Clear filters" onPress={clearFilters} variant="ghost" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
