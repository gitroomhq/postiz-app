import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { AppText } from '@/src/ui/text';
import { radius, spacing, typography, useTheme } from '@/src/ui/theme';

type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Field({ error, hint, label, multiline, style, ...props }: FieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.group}>
      {label ? (
        <AppText tone="muted" variant="label">
          {label}
        </AppText>
      ) : null}
      <TextInput
        {...props}
        multiline={multiline}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        placeholderTextColor={colors.mutedText}
        selectionColor={colors.tint}
        style={[
          styles.input,
          multiline ? styles.multiline : styles.single,
          {
            backgroundColor: colors.surfaceInset,
            borderColor: error ? colors.danger : focused ? colors.tint : colors.border,
            color: colors.text,
          },
          style,
        ]}
      />
      {error ? (
        <AppText tone="danger" variant="caption">
          {error}
        </AppText>
      ) : hint ? (
        <AppText tone="muted" variant="caption">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm - 1,
  },
  input: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: typography.body.fontSize,
    paddingHorizontal: spacing.md + 2,
  },
  multiline: {
    lineHeight: typography.body.lineHeight,
    minHeight: 110,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
  },
  single: {
    height: 48,
  },
});
