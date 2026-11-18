import type { BadgeTone } from '@/components/ui/Badge';
import type { IconName } from '@/components/ui/Icon';

export type CategoryVisual = {
  label: string;
  icon: IconName;
  tone: BadgeTone;
};

const visuals: Record<string, CategoryVisual> = {
  'food-and-snacks': { label: 'Food & Drinks', icon: 'utensils', tone: 'food' },
  fashion: { label: 'Fashion & Style', icon: 'shirt', tone: 'fashion' },
  'electronics-and-gadgets': { label: 'Electronics & Gadgets', icon: 'laptop', tone: 'tech' },
  'books-and-stationery': { label: 'Study Essentials', icon: 'book-open', tone: 'violet' },
  'beauty-and-personal-care': { label: 'Beauty & Care', icon: 'sparkles', tone: 'fashion' },
  services: { label: 'Services', icon: 'headphones', tone: 'services' },
  'room-essentials': { label: 'Room Essentials', icon: 'house', tone: 'violet' },
  other: { label: 'Other', icon: 'package', tone: 'lime' },
};

export function categoryVisual(slug: string, fallbackName: string): CategoryVisual {
  return visuals[slug] ?? { label: fallbackName, icon: 'package', tone: 'lime' };
}
