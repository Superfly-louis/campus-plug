import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { colors, layout, limits, motion, radius, spacing } from '@/constants/theme';

export type GalleryImage = {
  id: string;
  uri: string;
};

type ImagePickerGridProps = {
  images: readonly GalleryImage[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  max?: number;
};

const tile = spacing.huge * 2;

export function ImagePickerGrid({
  images,
  onAdd,
  onRemove,
  max = limits.maxProductImages,
}: ImagePickerGridProps) {
  const canAdd = images.length < max;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {images.map((image, index) => (
        <View
          key={image.id}
          style={{
            width: tile,
            height: tile,
            borderRadius: radius.lg,
            overflow: 'hidden',
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <Image source={{ uri: image.uri }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
          {index === 0 ? (
            <View style={{ position: 'absolute', left: spacing.xxs, bottom: spacing.xxs }}>
              <Badge label="Cover" tone="lime" />
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={index === 0 ? 'Remove cover photo' : 'Remove photo'}
            onPress={() => onRemove(image.id)}
            style={({ pressed }) => ({
              position: 'absolute',
              top: spacing.xxs,
              right: spacing.xxs,
              width: layout.minTouchTarget,
              height: layout.minTouchTarget,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.overlay,
              opacity: pressed ? motion.pressedOpacity : 1,
            })}
          >
            <Icon name="x" color="textPrimary" />
          </Pressable>
        </View>
      ))}
      {canAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add photo"
          onPress={onAdd}
          style={({ pressed }) => ({
            width: tile,
            height: tile,
            borderRadius: radius.lg,
            borderWidth: layout.borderWidth,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? motion.pressedOpacity : 1,
          })}
        >
          <Icon name="plus" color="lilac" />
        </Pressable>
      ) : null}
    </View>
  );
}
