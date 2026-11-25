import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { orderStatus, timelineLabels, type DbOrderStatus } from '@/constants/orderStatus';
import { colors, icon, layout, radius, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

const stepSize = spacing.xxl;
const line = layout.ringWidth;

type StepState = 'done' | 'current' | 'upcoming';

function stepState(status: DbOrderStatus, index: number): StepState {
  const step = orderStatus[status].timelineStep;
  if (step == null) return 'upcoming';
  if (status === 'completed' || index < step) return 'done';
  if (index === step) return 'current';
  return 'upcoming';
}

export function OrderTimeline({ status }: { status: DbOrderStatus }) {
  useThemeMode();
  const meta = orderStatus[status];
  if (meta.terminal) {
    const declined = status === 'rejected';
    return (
      <View accessibilityLabel={meta.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: stepSize,
            height: stepSize,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: declined ? colors.danger : colors.surfaceAlt,
          }}
        >
          <Icon name={declined ? 'x' : 'info'} size={icon.sm} color={declined ? 'paper' : 'textMuted'} />
        </View>
        <Text style={[typography.bodyMedium, { flex: 1, color: declined ? colors.danger : colors.textPrimary }]}>
          {meta.label}
        </Text>
      </View>
    );
  }

  return (
    <View accessibilityLabel={meta.label} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {timelineLabels.map((label, index) => {
        const state = stepState(status, index);
        const lineColor = state === 'done' ? colors.primary : state === 'current' ? colors.violet : colors.border;
        return (
          <View key={label} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: '100%', height: stepSize, alignItems: 'center', justifyContent: 'center' }}>
              {index > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    width: '50%',
                    top: (stepSize - line) / 2,
                    height: line,
                    backgroundColor: lineColor,
                  }}
                />
              ) : null}
              {index < timelineLabels.length - 1 ? (
                <View
                  style={{
                    position: 'absolute',
                    left: '50%',
                    right: 0,
                    top: (stepSize - line) / 2,
                    height: line,
                    backgroundColor:
                      stepState(status, index + 1) === 'done'
                        ? colors.primary
                        : stepState(status, index + 1) === 'current'
                          ? colors.violet
                          : colors.border,
                  }}
                />
              ) : null}
              <View
                style={{
                  width: stepSize,
                  height: stepSize,
                  borderRadius: radius.pill,
                  borderWidth: state === 'upcoming' ? layout.borderWidth : 0,
                  borderColor: colors.border,
                  backgroundColor:
                    state === 'done' ? colors.primary : state === 'current' ? colors.violet : colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {state === 'done' ? <Icon name="check" size={icon.sm} color="textOnPrimary" /> : null}
                {state === 'current' ? (
                  <View
                    style={{
                      width: spacing.sm,
                      height: spacing.sm,
                      borderRadius: radius.pill,
                      backgroundColor: colors.paper,
                    }}
                  />
                ) : null}
              </View>
            </View>
            <Text
              style={[
                typography.caption,
                {
                  color: state === 'current' ? colors.violet : state === 'done' ? colors.textPrimary : colors.textMuted,
                  textAlign: 'center',
                },
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
