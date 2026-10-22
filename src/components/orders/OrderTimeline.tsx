import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { orderStatus, timelineLabels, type DbOrderStatus } from '@/constants/orderStatus';
import { colors, icon, layout, radius, spacing, typography } from '@/constants/theme';

const stepSize = spacing.xl;

export function OrderTimeline({ status }: { status: DbOrderStatus }) {
  const meta = orderStatus[status];
  if (meta.terminal) {
    const declined = status === 'rejected';
    return (
      <View accessibilityLabel={meta.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Icon name={declined ? 'x' : 'info'} size={icon.sm} color={declined ? 'danger' : 'textMuted'} />
        <Text style={[typography.bodyMedium, { color: declined ? colors.danger : colors.textMuted }]}>{meta.label}</Text>
      </View>
    );
  }

  return (
    <View accessibilityLabel={meta.label} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {timelineLabels.map((label, index) => {
        const current = meta.timelineStep === index;
        const done = meta.timelineStep != null && index < meta.timelineStep;
        return (
          <View key={label} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
              {index > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: '50%',
                    height: layout.borderWidth,
                    backgroundColor: done || current ? colors.violet : colors.border,
                  }}
                />
              ) : null}
              <View
                style={{
                  width: stepSize,
                  height: stepSize,
                  borderRadius: radius.pill,
                  borderWidth: current ? layout.ringWidth : layout.borderWidth,
                  borderColor: current ? colors.violet : done ? colors.primary : colors.border,
                  backgroundColor: done ? colors.primary : colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? <Icon name="check" size={icon.sm} color="textOnPrimary" /> : null}
              </View>
            </View>
            <Text style={[typography.caption, { color: current ? colors.violet : colors.textMuted, textAlign: 'center' }]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
