import type { BadgeTone } from '@/components/ui/Badge';
import type { IconName } from '@/components/ui/Icon';

export type CategoryVisual = {
  label: string;
  icon: IconName;
  tone: BadgeTone;
};

const visuals: Record<string, CategoryVisual> = {
  'food-and-snacks': { label: 'Food\n& Drinks', icon: 'utensils', tone: 'food' },
  fashion: { label: 'Fashion\n& Style', icon: 'shirt', tone: 'fashion' },
  'electronics-and-gadgets': { label: 'Electronics\n& Gadgets', icon: 'laptop', tone: 'tech' },
  'books-and-stationery': { label: 'Study\nEssentials', icon: 'book-open', tone: 'violet' },
  'beauty-and-personal-care': { label: 'Beauty\n& Care', icon: 'sparkles', tone: 'fashion' },
  services: { label: 'Services', icon: 'headphones', tone: 'services' },
  'room-essentials': { label: 'Room\nEssentials', icon: 'house', tone: 'violet' },
  other: { label: 'Other', icon: 'package', tone: 'lime' },
};

export function categoryVisual(slug: string, fallbackName: string): CategoryVisual {
  return visuals[slug] ?? { label: fallbackName, icon: 'package', tone: 'lime' };
}
