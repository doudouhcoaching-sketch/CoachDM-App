// ═══════════════════════════════════════════════════════════════
// COACH DM — Composants UI primitifs
// ═══════════════════════════════════════════════════════════════

import { forwardRef, useState } from 'react';
import {
  Pressable,
  PressableProps,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radius, shadows } from '@/theme';

// ─────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  haptic?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  haptic = true,
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onPress?.(e);
  };

  const variantStyle = buttonVariants[variant];
  const sizeStyle = buttonSizes[size];

  return (
    <Pressable
      {...rest}
      onPress={isDisabled ? undefined : handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btnBase,
        sizeStyle.container,
        variantStyle.container,
        fullWidth && { alignSelf: 'stretch' },
        pressed && !isDisabled && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        isDisabled && styles.btnDisabled,
        typeof style === 'function' ? style({ pressed: false, hovered: false, focused: false }) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.label.color} size="small" />
      ) : (
        <>
          {icon ? <View style={{ marginRight: spacing['2'] }}>{icon}</View> : null}
          <Text style={[styles.btnLabel, sizeStyle.label, variantStyle.label]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<
  ButtonVariant,
  { container: object; label: { color: string } }
> = {
  primary: {
    container: {
      backgroundColor: colors.primary,
      ...shadows.goldGlow,
    },
    label: { color: colors.textOnPrimary },
  },
  secondary: {
    container: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: { color: colors.text },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    label: { color: colors.primary },
  },
  danger: {
    container: { backgroundColor: colors.danger },
    label: { color: colors.text },
  },
};

const buttonSizes: Record<ButtonSize, { container: object; label: object }> = {
  sm: {
    container: { paddingVertical: spacing['2'], paddingHorizontal: spacing['4'] },
    label: { fontSize: typography.sm },
  },
  md: {
    container: { paddingVertical: spacing['3'], paddingHorizontal: spacing['5'] },
    label: { fontSize: typography.base },
  },
  lg: {
    container: { paddingVertical: spacing['4'], paddingHorizontal: spacing['6'] },
    label: { fontSize: typography.lg },
  },
};

// ─────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ variant = 'default', style, children, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.cardBase,
        variant === 'elevated' && styles.cardElevated,
        variant === 'outlined' && styles.cardOutlined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  rightSlot?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, rightSlot, style, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <View style={styles.inputWrap}>
        {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
        <View
          style={[
            styles.inputBox,
            focused && styles.inputBoxFocused,
            error && styles.inputBoxError,
          ]}
        >
          <TextInput
            {...rest}
            ref={ref}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            placeholderTextColor={colors.textTertiary}
            style={[styles.inputField, style]}
          />
          {rightSlot}
        </View>
        {error ? <Text style={styles.inputError}>{error}</Text> : null}
      </View>
    );
  },
);
Input.displayName = 'Input';

// ─────────────────────────────────────────────────────────────
// Pill (badge)
// ─────────────────────────────────────────────────────────────

interface PillProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'danger';
}

export function Pill({ label, variant = 'default' }: PillProps) {
  const bg = {
    default: colors.surfaceElevated,
    primary: colors.primarySubtle,
    success: 'rgba(16, 185, 129, 0.15)',
    danger: 'rgba(239, 68, 68, 0.15)',
  }[variant];

  const textColor = {
    default: colors.textSecondary,
    primary: colors.primary,
    success: colors.success,
    danger: colors.danger,
  }[variant];

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Button
  btnBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  btnLabel: {
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // Card
  cardBase: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['5'],
  },
  cardElevated: {
    backgroundColor: colors.surfaceElevated,
    ...shadows.md,
  },
  cardOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Input
  inputWrap: {
    marginBottom: spacing['4'],
  },
  inputLabel: {
    fontSize: typography.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing['2'],
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing['4'],
  },
  inputBoxFocused: {
    borderColor: colors.primary,
  },
  inputBoxError: {
    borderColor: colors.danger,
  },
  inputField: {
    flex: 1,
    color: colors.text,
    fontSize: typography.base,
    paddingVertical: spacing['3'],
  },
  inputError: {
    fontSize: typography.xs,
    color: colors.danger,
    marginTop: spacing['1'],
  },

  // Pill
  pill: {
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['1'],
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: typography.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
