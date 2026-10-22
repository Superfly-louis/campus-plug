import type { ImageSource } from 'expo-image';

import type { IconColor, IconName } from '@/components/ui/Icon';
import { illustration, illustrationFile } from '@/constants/theme';

export type IllustrationName = 'hero-piggy' | 'hero-pin' | 'promo-food' | 'promo-shop' | 'logo-icon';

export type IllustrationAsset = {
  file: string;
  source: ImageSource | null;
  icon: IconName;
  tint: IconColor;
  width: number;
  height: number;
};

/**
 * `source` stays null until the file is in assets/illustrations.
 * A static require() of a missing file fails the Metro bundle, so the
 * placeholder renders instead of crashing. When the file exists, set source to
 * require('@/assets/illustrations/<file>').
 */
export const illustrations: Record<IllustrationName, IllustrationAsset> = {
  'hero-piggy': {
    file: 'hero-piggy.png',
    source: require('@/assets/illustrations/hero-piggy.png'),
    icon: 'piggy-bank',
    tint: 'violet',
    width: illustrationFile.heroPiggy.width,
    height: illustrationFile.heroPiggy.height,
  },
  'hero-pin': {
    file: 'hero-pin.png',
    source: require('@/assets/illustrations/hero-pin.png'),
    icon: 'map-pin',
    tint: 'lilac',
    width: illustrationFile.heroPin.width,
    height: illustrationFile.heroPin.height,
  },
  'promo-food': {
    file: 'promo-food.jpg',
    source: require('@/assets/illustrations/promo-food.jpg'),
    icon: 'utensils',
    tint: 'primary',
    width: illustrationFile.promoFood.width,
    height: illustrationFile.promoFood.height,
  },
  'promo-shop': {
    file: 'promo-shop.jpg',
    source: require('@/assets/illustrations/promo-shop.jpg'),
    icon: 'store',
    tint: 'violet',
    width: illustrationFile.promoShop.width,
    height: illustrationFile.promoShop.height,
  },
  'logo-icon': {
    file: 'logo-icon.png',
    source: null,
    icon: 'zap',
    tint: 'primary',
    width: illustration.logo,
    height: illustration.logo,
  },
};
