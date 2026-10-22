import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, decoration } from '@/constants/theme';

type CurveProps = {
  width?: number;
  height?: number;
};

export function Curve({
  width = decoration.curveWidth,
  height = decoration.curveHeight,
}: CurveProps) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${decoration.curveWidth} ${decoration.curveHeight}`}
      >
        <Path
          d="M4 58C36 8 84 6 122 34C154 56 186 18 216 28"
          stroke={colors.primary}
          strokeWidth={decoration.curveStroke}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
