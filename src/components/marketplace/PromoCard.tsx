import { Image, type ImageContentPosition, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { promoCardLayout } from '@/constants/promoCard';
import { fontFamily, icon, promoCard, radius, spacing } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

export type PromoCardProps = {
  label: string;
  headline: string;
  highlight?: string;
  description: string;
  image?: ImageSource | null;
  imageLabel?: string;
  imagePosition?: ImageContentPosition;
  buttonLabel: string;
  onPress: () => void;
};

export function PromoCard({
  label,
  headline,
  highlight,
  description,
  image,
  imageLabel,
  imagePosition = 'center',
  buttonLabel,
  onPress,
}: PromoCardProps) {
  useThemeMode();
  return (
    <View
      style={{
        borderRadius: promoCardLayout.radius,
        overflow: 'hidden',
        minHeight: promoCardLayout.minHeight,
        backgroundColor: promoCard.navy,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
      }}
    >
      {image ? (
        <Image
          accessibilityLabel={imageLabel}
          contentFit="cover"
          contentPosition={imagePosition}
          source={image}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '74%' }}
        />
      ) : null}
      <LinearGradient
        colors={[promoCard.navy, promoCard.navy, 'rgba(7,27,54,0)']}
        locations={[0, 0.34, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View
        style={{
          minHeight: promoCardLayout.minHeight,
          justifyContent: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.md,
          paddingLeft: spacing.lg,
          paddingRight: '36%',
        }}
      >
        <Text
          style={{
            color: promoCard.lime,
            fontFamily: fontFamily.jakartaSemiBold,
            fontSize: promoCardLayout.label,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <Headline highlight={highlight} text={headline} />
        <Text
          numberOfLines={2}
          style={{
            color: promoCard.mist,
            fontFamily: fontFamily.jakartaSemiBold,
            fontSize: promoCardLayout.body,
            lineHeight: promoCardLayout.bodyLine,
          }}
        >
          {description}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          onPress={onPress}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xxs,
            minHeight: 34,
            marginTop: spacing.xxs,
            paddingHorizontal: spacing.md,
            borderRadius: radius.pill,
            backgroundColor: promoCard.lime,
            opacity: pressed ? 0.82 : 1,
          })}
        >
          <Text
            style={{
              color: promoCard.navy,
              fontFamily: fontFamily.jakartaSemiBold,
              fontSize: 13,
            }}
          >
            {buttonLabel}
          </Text>
          <Icon name="arrow-right" size={icon.sm} color="textOnPrimary" />
        </Pressable>
      </View>
    </View>
  );
}

function Headline({ text, highlight }: { text: string; highlight?: string }) {
  useThemeMode();
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((line) => (
        <Text
          adjustsFontSizeToFit
          key={line}
          minimumFontScale={0.62}
          numberOfLines={1}
          style={{
            fontFamily: fontFamily.jakartaExtraBold,
            fontSize: promoCardLayout.headline,
            lineHeight: promoCardLayout.headlineLine,
            color: highlight && line.toLowerCase() === highlight.toLowerCase() ? promoCard.lime : promoCard.white,
          }}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}
