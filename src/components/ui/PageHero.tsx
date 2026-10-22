import { Text, View } from 'react-native';

import { HighlightedTitle } from '@/components/HighlightedTitle';
import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';
import { colors, illustration, spacing, typography } from '@/constants/theme';

type PageHeroProps = {
  title: string;
  highlight?: string;
  titleLine2?: string;
  highlight2?: string;
  subtitle: string;
  illustration?: IllustrationName;
};

export function PageHero({
  title,
  highlight,
  titleLine2,
  highlight2,
  subtitle,
  illustration: illustrationName,
}: PageHeroProps) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
          <HighlightedTitle highlight={highlight}>{title}</HighlightedTitle>
          {titleLine2 ? <HighlightedTitle highlight={highlight2}>{titleLine2}</HighlightedTitle> : null}
        </View>
        {illustrationName ? (
          <Illustration
            name={illustrationName}
            width={illustrationName === 'hero-pin' ? illustration.heroPin : illustration.heroAside}
          />
        ) : null}
      </View>
      <Text style={[typography.body, { color: colors.textMuted }]}>{subtitle}</Text>
    </View>
  );
}
