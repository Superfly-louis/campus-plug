import type { IllustrationName } from '@/components/illustrations/Illustration';

export type PromoAction = { type: 'explore-category'; slug: string } | { type: 'sell' };

export type Promo = {
  id: string;
  eyebrow: string;
  line1: string;
  line2: string;
  subtitle: string;
  cta: string;
  illustration: IllustrationName;
  action: PromoAction;
};

export const promos: readonly Promo[] = [
  {
    id: 'food',
    eyebrow: 'Campus Special',
    line1: 'Good food,',
    line2: 'great vibes!',
    subtitle: 'Meals and snacks from people on campus.',
    cta: 'Explore Food',
    illustration: 'promo-food',
    action: { type: 'explore-category', slug: 'food-and-snacks' },
  },
  {
    id: 'sell',
    eyebrow: 'Vendors',
    line1: 'Got something to sell?',
    line2: 'Open your shop',
    subtitle: 'Apply once, then list what you sell.',
    cta: 'Start selling',
    illustration: 'promo-shop',
    action: { type: 'sell' },
  },
];
