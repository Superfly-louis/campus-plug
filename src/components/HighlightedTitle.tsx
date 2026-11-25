import { Text, type TextStyle } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

type TitleVariant = 'hero' | 'display' | 'h1' | 'h2';

type HighlightedTitleProps = {
  children: string;
  highlight?: string;
  highlightColor?: string;
  variant?: TitleVariant;
  color?: string;
  style?: TextStyle;
};

export function HighlightedTitle({
  children,
  highlight,
  highlightColor = colors.primary,
  variant = 'hero',
  color,
  style: extra,
}: HighlightedTitleProps) {
  useThemeMode();
  const style = [typography[variant], color ? { color } : null, extra];
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
      <Text style={{ color: highlightColor }}>{match}</Text>
      {after}
    </Text>
  );
}
