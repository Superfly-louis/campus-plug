import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, icon as iconSize, layout, radius, spacing, typography } from '@/constants/theme';

type TextFieldProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  icon?: IconName;
  secure?: boolean;
  helper?: string;
  error?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  editable?: boolean;
  multiline?: boolean;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secure = false,
  helper,
  error,
  keyboardType,
  autoCapitalize,
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  editable = true,
  multiline = false,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  const hint = error ?? helper;

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={typography.bodyMedium}>{label}</Text> : null}
      <View
        style={{
          minHeight: multiline ? spacing.huge * 2 : layout.minTouchTarget,
          paddingLeft: spacing.md,
          paddingRight: secure ? spacing.xxs : spacing.md,
          paddingVertical: multiline ? spacing.sm : 0,
          borderRadius: multiline ? radius.lg : radius.pill,
          borderWidth: layout.borderWidth,
          borderColor,
          backgroundColor: colors.surfaceAlt,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: spacing.xs,
        }}
      >
        {icon ? <Icon name={icon} size={iconSize.md} color={focused ? 'primary' : 'lilac'} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure && hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          multiline={multiline}
          numberOfLines={multiline ? 4 : undefined}
          textAlignVertical={multiline ? 'top' : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label ?? placeholder}
          accessibilityHint={hint}
          style={[typography.body, { flex: 1, paddingVertical: spacing.sm }]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((current) => !current)}
            style={{
              width: layout.minTouchTarget,
              height: layout.minTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={hidden ? 'eye' : 'eye-off'} color="lilac" />
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <Text style={[typography.caption, { color: error ? colors.danger : colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}
