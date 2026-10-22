import { ScrollView, View } from 'react-native';

import { CategoryTile } from '@/components/marketplace/CategoryTile';
import { categoryVisual } from '@/constants/categories';
import { colors, layout, radius, spacing } from '@/constants/theme';

export type CategoryChoice = {
  id: string;
  slug: string;
  name: string;
};

type CategoryRowProps = {
  categories: readonly CategoryChoice[];
  selectedId?: string | null;
  onSelect: (category: CategoryChoice | null) => void;
  contained?: boolean;
};

export function CategoryRow({ categories, selectedId = null, onSelect, contained = false }: CategoryRowProps) {
  function choose(category: CategoryChoice) {
    onSelect(selectedId === category.id ? null : category);
  }

  const row = (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xxs }}
    >
      {categories.map((category) => {
        const visual = categoryVisual(category.slug, category.name);
        return (
          <CategoryTile
            key={category.id}
            icon={visual.icon}
            label={visual.label}
            active={category.id === selectedId}
            onPress={() => choose(category)}
          />
        );
      })}
    </ScrollView>
  );

  if (!contained) return row;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: layout.borderWidth,
        borderColor: colors.border,
        borderRadius: radius.xl,
        padding: spacing.sm,
      }}
    >
      {row}
    </View>
  );
}
