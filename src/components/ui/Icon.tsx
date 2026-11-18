import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Crown,
  Ellipsis,
  Eye,
  EyeOff,
  Headphones,
  Heart,
  House,
  Info,
  Laptop,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Minus,
  MessageCircle,
  Package,
  Phone,
  PiggyBank,
  Plus,
  Search,
  Settings,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  TriangleAlert,
  User,
  Utensils,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import type { ComponentType } from 'react';

import { colors, icon } from '@/constants/theme';

const icons = {
  house: House,
  search: Search,
  'clipboard-check': ClipboardCheck,
  user: User,
  zap: Zap,
  bell: Bell,
  settings: Settings,
  'map-pin': MapPin,
  crown: Crown,
  minus: Minus,
  plus: Plus,
  'arrow-right': ArrowRight,
  check: Check,
  'check-check': CheckCheck,
  'piggy-bank': PiggyBank,
  utensils: Utensils,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  shirt: Shirt,
  laptop: Laptop,
  sparkles: Sparkles,
  'sliders-horizontal': SlidersHorizontal,
  'shopping-bag': ShoppingBag,
  'message-circle': MessageCircle,
  store: Store,
  'layout-dashboard': LayoutDashboard,
  'log-out': LogOut,
  package: Package,
  clock: Clock,
  'circle-check': CircleCheck,
  x: X,
  eye: Eye,
  'eye-off': EyeOff,
  mail: Mail,
  lock: Lock,
  phone: Phone,
  headphones: Headphones,
  heart: Heart,
  'book-open': BookOpen,
  ellipsis: Ellipsis,
  info: Info,
  'triangle-alert': TriangleAlert,
  'badge-check': BadgeCheck,
  star: Star,
} satisfies Record<string, ComponentType<LucideProps>>;

export type IconName = keyof typeof icons;
export type IconColor = keyof typeof colors;

type IconProps = {
  name: IconName;
  size?: number;
  color?: IconColor;
  strokeWidth?: number;
  accessibilityLabel?: string;
};

export function Icon({
  name,
  size = icon.md,
  color = 'textPrimary',
  strokeWidth = icon.strokeWidth,
  accessibilityLabel,
}: IconProps) {
  const Glyph = icons[name];
  return (
    <Glyph
      size={size}
      color={colors[color]}
      strokeWidth={strokeWidth}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
