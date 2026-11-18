import { illustrations } from '@/components/illustrations/registry';
import { PromoCard } from '@/components/marketplace/PromoCard';
import type { Promo } from '@/constants/promos';

type PromoBannerProps = {
  promo: Promo;
  onPress: () => void;
};

export function PromoBanner({ promo, onPress }: PromoBannerProps) {
  const art = illustrations[promo.illustration];
  return (
    <PromoCard
      buttonLabel={promo.cta}
      description={promo.subtitle}
      headline={`${promo.line1}\n${promo.line2}`}
      highlight={promo.line2}
      image={art.source}
      imageLabel={promo.line1}
      imagePosition={promo.illustration === 'promo-shop' ? 'left center' : 'center'}
      label={promo.eyebrow}
      onPress={onPress}
    />
  );
}
