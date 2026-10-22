import { Text } from 'react-native';

import { colors, typography } from '@/constants/theme';

type TitleVariant = 'hero' | 'display' | 'h1' | 'h2';

type HighlightedTitleProps = {
  children: string;
  highlight?: string;
  variant?: TitleVariant;
};

export function HighlightedTitle({
  children,
  highlight,
  variant = 'hero',
}: HighlightedTitleProps) {
  const style = typography[variant];
  if (!highlight) {
    return (
      <Text accessibilityRole="header" style={style}>
        {children}
      </Text>
    );
  }

  const index = children.toLowerCase().indexOf(highlight.toLowerCase());
  if (index < 0) {
    return (
      <Text accessibilityRole="header" style={style}>
        {children}
      </Text>
    );
  }

  const before = children.slice(0, index);
  const match = children.slice(index, index + highlight.length);
  const after = children.slice(index + highlight.length);

  return (
    <Text accessibilityRole="header" style={style}>
      {before}
      <Text style={{ color: colors.primary }}>{match}</Text>
      {after}
    </Text>
  );
}
