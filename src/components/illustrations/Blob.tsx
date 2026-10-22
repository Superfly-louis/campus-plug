import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, decoration } from '@/constants/theme';

type BlobProps = {
  width?: number;
  height?: number;
};

export function Blob({ width = decoration.blobWidth, height = decoration.blobHeight }: BlobProps) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox={`0 0 ${decoration.blobWidth} ${decoration.blobHeight}`}>
        <Path
          d="M48 18C78 2 128 8 148 42C170 80 146 128 102 136C52 146 8 112 6 72C4 40 22 32 48 18Z"
          fill={colors.violet}
          fillOpacity={decoration.blobOpacity}
        />
      </Svg>
    </View>
  );
}
