import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { Illustration } from '@/components/illustrations/Illustration';
import { Button } from '@/components/ui/Button';
import type { Promo } from '@/constants/promos';
import { colors, gradientAxis, gradients, radius, spacing, typography } from '@/constants/theme';

type PromoBannerProps = {
  promo: Promo;
  onPress: () => void;
};

const asideWidth = '48%';

export function PromoBanner({ promo, onPress }: PromoBannerProps) {
  return (
    <LinearGradient
      colors={gradients.banner}
      start={gradientAxis.start}
      end={gradientAxis.end}
      style={{
        borderRadius: radius.xl,
        overflow: 'hidden',
        minHeight: 168,
      }}
    >
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: asideWidth }}
      >
        <Illustration
          name={promo.illustration}
          fill
          contentFit="cover"
          contentPosition={promo.illustration === 'promo-shop' ? 'left center' : 'center'}
        />
        <LinearGradient
          colors={[colors.indigoDeep, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%' }}
        />
      </View>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.md,
          paddingLeft: spacing.lg,
          paddingRight: '52%',
        }}
      >
        <Text style={typography.eyebrow}>{promo.eyebrow}</Text>
        <View>
          <Text style={typography.h2}>{promo.line1}</Text>
          <Text style={[typography.h2, { color: colors.primary }]}>{promo.line2}</Text>
        </View>
        <Text style={typography.caption}>{promo.subtitle}</Text>
        <Button label={promo.cta} onPress={onPress} fullWidth={false} size="md" trailingArrow />
      </View>
    </LinearGradient>
  );
}
