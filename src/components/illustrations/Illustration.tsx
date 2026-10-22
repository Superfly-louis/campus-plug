import { Image, type ImageContentFit, type ImageContentPosition } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, icon, layout, radius } from '@/constants/theme';

import { illustrations, type IllustrationName } from './registry';

type IllustrationProps = {
  name: IllustrationName;
  accessibilityLabel?: string;
  width?: number;
  height?: number;
  /** Fill the parent on both axes. The parent sets the frame. */
  fill?: boolean;
  contentFit?: ImageContentFit;
  contentPosition?: ImageContentPosition;
};

const labels: Record<IllustrationName, string> = {
  'hero-piggy': 'Piggy bank',
  'hero-pin': 'Campus map pin',
  'promo-food': 'Bowl of campus food',
  'promo-shop': 'Student opening a campus shop',
  'logo-icon': 'Campus Plug mark',
};

const placeholderIcon: Record<IllustrationName, number> = {
  'hero-piggy': icon.xl,
  'hero-pin': icon.xl,
  'promo-food': icon.xl,
  'promo-shop': icon.xl,
  'logo-icon': icon.lg,
};

function Placeholder({
  name,
  width,
  height,
  glyph,
  tint,
}: {
  name: IllustrationName;
  width: number | '100%';
  height?: number | '100%';
  glyph: IconName;
  tint: keyof typeof colors;
}) {
  return (
    <View
      accessibilityLabel={labels[name]}
      accessibilityRole="image"
      style={{
        width,
        height,
        borderRadius: radius.xl,
        backgroundColor: colors.surfaceAlt,
        borderWidth: layout.borderWidth,
        borderColor: colors[tint],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={glyph} size={placeholderIcon[name]} color={tint} />
    </View>
  );
}

export function Illustration({
  name,
  accessibilityLabel,
  width,
  height,
  fill = false,
  contentFit = 'contain',
  contentPosition = 'center',
}: IllustrationProps) {
  const asset = illustrations[name];
  const displayWidth = fill ? '100%' : (width ?? asset.width);
  const displayHeight = fill
    ? '100%'
    : (height ?? (width == null ? asset.height : Math.round((width * asset.height) / asset.width)));
  const [failed, setFailed] = useState(false);
  const label = accessibilityLabel ?? labels[name];

  if (!asset.source || failed) {
    return (
      <Placeholder name={name} width={displayWidth} height={displayHeight} glyph={asset.icon} tint={asset.tint} />
    );
  }

  return (
    <Image
      source={asset.source}
      accessibilityLabel={label}
      contentFit={contentFit}
      contentPosition={contentPosition}
      onError={() => setFailed(true)}
      style={{ width: displayWidth, height: displayHeight }}
    />
  );
}

export type { IllustrationName };
