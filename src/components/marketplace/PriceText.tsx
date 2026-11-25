import { Text } from 'react-native';

import { formatPrice } from '@/lib/format';
import { typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

export function PriceText({ amount }: { amount: number }) {
  useThemeMode();
  return <Text style={typography.price}>{formatPrice(amount)}</Text>;
}
