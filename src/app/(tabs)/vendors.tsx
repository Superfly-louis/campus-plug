import { router } from 'expo-router';
import { FlatList, Text, View } from 'react-native';

import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { VendorCard, VendorCardSkeleton } from '@/components/marketplace/VendorCard';
import { Screen } from '@/components/ui/Screen';
import { RefreshSpinner } from '@/components/ui/RefreshSpinner';
import { useTabBarInset } from '@/components/ui/TabBar';
import { spacing, typography } from '@/constants/theme';
import { useHomeVendors } from '@/hooks/queries/useVendors';
import { toFriendlyError } from '@/lib/errors';

const skeletons = ['one', 'two', 'three', 'four'] as const;

export default function VendorsScreen() {
  const tabInset = useTabBarInset();
  const home = useHomeVendors();
  const refreshing = home.isRefetching && !home.isPending;

  return (
    <Screen>
      <FlatList contentInsetAdjustmentBehavior="never"
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={{ flexGrow: 1, gap: spacing.sm, paddingBottom: spacing.xl + tabInset }}
        data={home.isPending || home.isError ? [] : home.cards}
        keyExtractor={(vendor) => vendor.id}
        numColumns={2}
        refreshControl={
          <RefreshSpinner
            onRefresh={() => {
              void home.refetch();
            }}
            refreshing={refreshing}
          />
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <VendorCard
              categoryLabel={item.categoryLabel}
              coverUrl={item.coverUrl}
              fill
              isNew={item.isNew}
              logoUrl={item.logoUrl}
              name={item.name}
              onPress={() => router.push({ pathname: '/shop/[id]', params: { id: item.id } })}
              productCount={item.productCount}
              variant="explore"
            />
          </View>
        )}
        ListHeaderComponent={<Text style={[typography.h1, { marginBottom: spacing.sm }]}>Vendors</Text>}
        ListEmptyComponent={
          home.isPending ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {skeletons.map((key) => (
                <View key={key} style={{ width: '47%' }}>
                  <VendorCardSkeleton fill />
                </View>
              ))}
            </View>
          ) : home.isError ? (
            <MarketplaceState
              message={toFriendlyError(home.error)}
              onRetry={() => {
                void home.refetch();
              }}
              status="error"
            />
          ) : (
            <MarketplaceState
              body="Approved shops show up here. A paused shop stays hidden until it opens again."
              icon="store"
              status="empty"
              title="No shops yet"
            />
          )
        }
        style={{ flex: 1 }}
      />
    </Screen>
  );
}
