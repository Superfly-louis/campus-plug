import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import type { OrderListFilter } from '@/constants/orderStatus';
import { spacing } from '@/constants/theme';

const chips: readonly { value: OrderListFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

type FilterChipsProps = {
  value: OrderListFilter;
  onChange: (value: OrderListFilter) => void;
};

export function FilterChips({ value, onChange }: FilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
      {chips.map((chip) => (
        <Chip
          active={chip.value === value}
          key={chip.value}
          label={chip.label}
          onPress={() => onChange(chip.value)}
        />
      ))}
    </ScrollView>
  );
}
