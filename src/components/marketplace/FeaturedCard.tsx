import { Text, View } from 'react-native';

import { VendorCard } from '@/components/marketplace/VendorCard';
import { FEATURED_VENDOR_ID } from '@/constants/config';
import { spacing, typography } from '@/constants/theme';

type FeaturedCardProps = {
  id: string;
  name: string;
  categoryLabel?: string | null;
  description?: string | null;
  productCount: number;
  coverUrl?: string | null;
  logoUrl?: string | null;
  onPress: () => void;
};

export function FeaturedCard({ id, ...vendor }: FeaturedCardProps) {
  if (!FEATURED_VENDOR_ID || id !== FEATURED_VENDOR_ID) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.eyebrow}>Featured Vendor</Text>
      <VendorCard {...vendor} description={vendor.description} variant="explore" fill />
    </View>
  );
}
