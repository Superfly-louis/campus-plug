import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { HighlightedTitle } from '@/components/HighlightedTitle';
import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';
import { colors, illustration, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

type PageHeroProps = {
  title: string;
  highlight?: string;
  titleLine2?: string;
  highlight2?: string;
  subtitle?: string;
  illustration?: IllustrationName;
  actions?: ReactNode;
};

export function PageHero({
  title,
  highlight,
  titleLine2,
  highlight2,
  subtitle,
  illustration: illustrationName,
  actions,
}: PageHeroProps) {
  useThemeMode();
  const art = illustrationName ? (
    <Illustration
      name={illustrationName}
      width={illustrationName === 'hero-pin' ? illustration.heroPin : illustration.heroAside}
    />
  ) : null;
  const titleBlock = (
    <View style={{ flex: 1, minWidth: 0, gap: illustrationName ? spacing.xs : 0 }}>
      <HighlightedTitle highlight={highlight}>{title}</HighlightedTitle>
      {titleLine2 ? <HighlightedTitle highlight={highlight2}>{titleLine2}</HighlightedTitle> : null}
    </View>
  );

  return (
    <View style={{ gap: spacing.xs }}>
      {actions && art ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <HighlightedTitle highlight={highlight}>{title}</HighlightedTitle>
            {titleLine2 ? <HighlightedTitle highlight={highlight2}>{titleLine2}</HighlightedTitle> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {actions}
            {art}
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {actions ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <HighlightedTitle highlight={highlight}>{title}</HighlightedTitle>
            </View>
          ) : (
            titleBlock
          )}
          {actions}
          {art}
        </View>
      )}
      {actions && !art && titleLine2 ? (
        <HighlightedTitle highlight={highlight2}>{titleLine2}</HighlightedTitle>
      ) : null}
      {subtitle ? <Text style={[typography.body, { color: colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}
