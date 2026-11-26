import { Text } from 'react-native';

import { formatPesewas, formatPrice } from '@/lib/format';
import { typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

export function PriceText({ amount, pesewas }: { amount?: number; pesewas?: number }) {
  useThemeMode();
  const text = pesewas != null ? formatPesewas(pesewas) : formatPrice(amount ?? 0);
  return <Text style={typography.price}>{text}</Text>;
}
