import { Platform, type ColorValue, type ViewProps } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';

let glass: boolean | undefined;

export function liquidGlassAvailable(): boolean {
  if (glass !== undefined) {
    return glass;
  }
  if (Platform.OS !== 'ios') {
    glass = false;
    return glass;
  }
  try {
    glass = isGlassEffectAPIAvailable();
  } catch {
    glass = false;
  }
  return glass;
}

type GlassSurfaceProps = ViewProps & {
  interactive?: boolean;
  tint?: ColorValue;
  effect?: 'regular' | 'clear';
};

export function GlassSurface({
  interactive = false,
  tint,
  effect = 'regular',
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  return (
    <GlassView
      colorScheme="dark"
      glassEffectStyle={effect}
      isInteractive={interactive}
      tintColor={tint}
      style={[{ backgroundColor: 'transparent' }, style]}
      {...rest}
    >
      {children}
    </GlassView>
  );
}
