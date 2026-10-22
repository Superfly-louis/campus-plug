import { Platform, type TextStyle, type ViewStyle } from 'react-native';

const black = '#000000';
const primaryHex = '#B5F94D';
const violetHex = '#5B33EE';

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export const colors = {
  background: '#061B36',
  backgroundDeep: '#02132C',
  surface: '#0B2542',
  surfaceAlt: '#162F52',
  indigoDeep: '#17275F',
  indigo: '#323CA1',
  violet: violetHex,
  lilac: '#B07AEF',
  periwinkle: '#8A93E8',
  border: '#2F3C8F',
  primary: primaryHex,
  primaryPressed: '#9BDD34',
  textOnPrimary: '#101018',
  textPrimary: '#F5F5F5',
  textMuted: '#C2CAD3',
  warning: '#FCCE51',
  danger: '#FF6B6B',
  success: primaryHex,
  info: violetHex,
  primarySoft: withAlpha(primaryHex, 0.18),
  overlay: withAlpha(black, 0.55),
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const layout = {
  screenPadding: 20,
  minTouchTarget: 48,
  tabBarHeight: 64,
  tabIndicator: 3,
  fabSize: 68,
  borderWidth: 1,
  ringWidth: 2,
} as const;

export const control = {
  buttonLg: 52,
  avatarLg: 96,
} as const;

export const motion = {
  pressedOpacity: 0.82,
  disabledOpacity: 0.4,
  skeletonMinOpacity: 0.45,
  skeletonDurationMs: 900,
  secondMs: 1000,
} as const;

export const gradientAxis = {
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
} as const;

export const icon = {
  strokeWidth: 1.75,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
} as const;

export const illustration = {
  hero: 148,
  heroAside: 140,
  heroPin: 168,
  logo: 64,
} as const;

export const illustrationFile = {
  heroPiggy: { width: 745, height: 682 },
  heroPin: { width: 765, height: 423 },
  promoFood: { width: 1024, height: 682 },
  promoShop: { width: 1024, height: 682 },
  logoIcon: { width: 256, height: 256 },
} as const;

export const decoration = {
  blobWidth: 160,
  blobHeight: 140,
  blobOpacity: 0.45,
  curveWidth: 220,
  curveHeight: 72,
  curveStroke: 10,
} as const;

const shadowOpacity = {
  card: 0.28,
  glow: 0.55,
} as const;

const shadowRadius = {
  card: 12,
  glow: 18,
} as const;

const shadowElevation = {
  card: 4,
  glow: 10,
} as const;

const cardShadowOffset = 8;

function shadow(color: string, kind: 'card' | 'glow'): ViewStyle {
  const isCard = kind === 'card';
  const blur = isCard ? shadowRadius.card : shadowRadius.glow;
  const opacity = isCard ? shadowOpacity.card : shadowOpacity.glow;
  const offsetY = isCard ? cardShadowOffset : 0;
  return (
    Platform.select<ViewStyle>({
      ios: {
        shadowColor: color,
        shadowOffset: { width: 0, height: offsetY },
        shadowOpacity: opacity,
        shadowRadius: blur,
      },
      android: {
        elevation: isCard ? shadowElevation.card : shadowElevation.glow,
        shadowColor: color,
      },
      default: {
        boxShadow: `0 ${offsetY}px ${blur}px ${color}`,
      },
    }) ?? {}
  );
}

export const shadows = {
  card: shadow(black, 'card'),
  glowLime: shadow(colors.primary, 'glow'),
  glowViolet: shadow(colors.violet, 'glow'),
} as const;

export const gradients = {
  banner: [colors.indigoDeep, colors.backgroundDeep],
  screen: [colors.background, colors.backgroundDeep],
} as const;

export const fontFamily = {
  jakartaSemiBold: 'PlusJakartaSans_600SemiBold',
  jakartaBold: 'PlusJakartaSans_700Bold',
  jakartaExtraBold: 'PlusJakartaSans_800ExtraBold',
  dmRegular: 'DMSans_400Regular',
  dmMedium: 'DMSans_500Medium',
  dmSemiBold: 'DMSans_600SemiBold',
} as const;

const eyebrowLetterSpacing = 1.2;

function text(
  family: string,
  size: number,
  lineHeight: number,
  color: string,
  extra?: TextStyle,
): TextStyle {
  return { fontFamily: family, fontSize: size, lineHeight, color, ...extra };
}

export const typography = {
  hero: text(fontFamily.jakartaExtraBold, 34, 40, colors.textPrimary),
  wordmark: text(fontFamily.jakartaExtraBold, 24, 30, colors.textPrimary),
  display: text(fontFamily.jakartaBold, 28, 34, colors.textPrimary),
  h1: text(fontFamily.jakartaBold, 24, 30, colors.textPrimary),
  h2: text(fontFamily.jakartaSemiBold, 18, 24, colors.textPrimary),
  price: text(fontFamily.jakartaBold, 17, 22, colors.primary),
  body: text(fontFamily.dmRegular, 15, 22, colors.textPrimary),
  bodyMedium: text(fontFamily.dmMedium, 15, 22, colors.textPrimary),
  button: text(fontFamily.dmSemiBold, 14, 20, colors.textPrimary),
  bodySmall: text(fontFamily.dmRegular, 13, 18, colors.textMuted),
  caption: text(fontFamily.dmRegular, 12, 16, colors.textMuted),
  eyebrow: text(fontFamily.dmSemiBold, 12, 16, colors.lilac, {
    letterSpacing: eyebrowLetterSpacing,
    textTransform: 'uppercase',
  }),
} as const;

export const query = {
  staleTimeMs: 30_000,
  retry: 1,
  unreadRefetchMs: 60_000,
} as const;

export const limits = {
  passwordMin: 8,
  nameMin: 2,
  nameMax: 60,
  campusMin: 2,
  campusMax: 80,
  otpMin: 6,
  otpMax: 10,
  phoneSubscriberDigits: 9,
  resendCooldownSec: 60,
  shopNameMin: 3,
  shopNameMax: 40,
  shopDescriptionMax: 300,
  productTitleMin: 2,
  productTitleMax: 80,
  productDescriptionMax: 1000,
  productPriceMax: 100_000,
  productImageWidth: 1200,
  logoImageWidth: 512,
  jpegQuality: 0.7,
  maxImageBytes: 5_242_880,
  searchPageSize: 20,
  coverSampleSize: 40,
  maxProductImages: 5,
  messageMax: 2000,
  orderQuantityMax: 50,
  orderItemMax: 50,
  meetingPointMin: 2,
  meetingPointMax: 120,
  orderNoteMax: 300,
  messagePageSize: 30,
  orderPageSize: 15,
  notificationPageSize: 20,
  adminPageSize: 20,
  moderationReasonMax: 500,
  conversationPreviewSample: 100,
} as const;

export const marketplace = {
  categoryTileWidth: 112,
  categoryTileHeight: 60,
  vendorCardWidth: 220,
  coverHeight: 128,
  productImageHeight: 148,
  miniCardWidth: 148,
  miniImageHeight: 104,
  featuredCover: 168,
  carouselHeight: 280,
  promoAdvanceSec: 5,
  newVendorMs: 7 * 24 * 60 * 60 * 1000,
  searchDebounceMs: 300,
} as const;

export const detailFractionDigits = 1;

export const priceFractionDigits = 2;
