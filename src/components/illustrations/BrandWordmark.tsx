import { Image } from 'expo-image';
import { View } from 'react-native';

const source = require('@/assets/illustrations/logo-lockup.png');
const aspect = 1;

type BrandWordmarkProps = {
  tone?: 'dark' | 'paper';
  width?: number;
};

export function BrandWordmark({ tone = 'dark', width }: BrandWordmarkProps) {
  const onPaper = tone === 'paper';
  const size = width ?? (onPaper ? 210 : 148);

  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="Campus Plug"
      style={{ alignSelf: onPaper ? 'center' : 'flex-start' }}
    >
      <Image
        accessible={false}
        contentFit="contain"
        source={source}
        style={{ width: size, height: Math.round(size / aspect) }}
      />
    </View>
  );
}
