import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { campuses, isCampus, type Campus } from '@/constants/campuses';
import { colors, icon, layout, motion, radius, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

type CampusChoicesProps = {
  value: string;
  onChange: (value: Campus) => void;
  error?: string;
  tone?: 'dark' | 'paper';
};

export function CampusChoices({ value, onChange, error, tone = 'dark' }: CampusChoicesProps) {
  useThemeMode();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const paper = tone === 'paper';
  const selected = isCampus(value) ? value : '';

  function choose(campus: Campus) {
    onChange(campus);
    setOpen(false);
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[typography.bodyMedium, { color: paper ? colors.ink : colors.textPrimary }]}>Campus</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selected ? `Campus, ${selected}` : 'Choose your campus'}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: layout.minTouchTarget,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          borderWidth: layout.borderWidth,
          borderColor: error ? colors.danger : paper ? colors.dot : colors.border,
          backgroundColor: paper ? colors.paper : colors.surfaceAlt,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          opacity: pressed ? motion.pressedOpacity : 1,
        })}
      >
        <Icon color={paper ? 'inkMuted' : 'lilac'} name="map-pin" size={icon.md} />
        <Text
          numberOfLines={1}
          style={[typography.body, { flex: 1, color: selected ? (paper ? colors.ink : colors.textPrimary) : paper ? colors.inkMuted : colors.textMuted }]}
        >
          {selected || 'Choose your campus'}
        </Text>
        <Icon color={paper ? 'inkMuted' : 'lilac'} name="chevron-down" size={icon.sm} />
      </Pressable>
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Modal animationType="slide" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            accessibilityLabel="Close campus list"
            onPress={() => setOpen(false)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.overlay }}
          />
          <View
            style={{
              padding: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              backgroundColor: paper ? colors.paper : colors.surface,
              gap: spacing.sm,
            }}
          >
            <Text accessibilityRole="header" style={[typography.h2, { color: paper ? colors.ink : colors.textPrimary }]}>
              Campus
            </Text>
            {campuses.map((campus) => {
              const active = campus === selected;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={campus}
                  accessibilityState={{ selected: active }}
                  key={campus}
                  onPress={() => choose(campus)}
                  style={({ pressed }) => ({
                    minHeight: layout.minTouchTarget,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.lg,
                    borderWidth: layout.borderWidth,
                    borderColor: active ? (paper ? colors.violet : colors.primary) : paper ? colors.dot : colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: spacing.sm,
                    opacity: pressed ? motion.pressedOpacity : 1,
                  })}
                >
                  <Text style={[typography.bodyMedium, { color: paper ? colors.ink : colors.textPrimary }]}>{campus}</Text>
                  {active ? <Icon color={paper ? 'violet' : 'primary'} name="check" size={icon.sm} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}
