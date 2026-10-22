import { Text } from 'react-native';

import { formatPrice } from '@/lib/format';
import { typography } from '@/constants/theme';

export function PriceText({ amount }: { amount: number }) {
  return <Text style={typography.price}>{formatPrice(amount)}</Text>;
}
