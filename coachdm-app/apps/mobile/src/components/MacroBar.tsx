// ═══════════════════════════════════════════════════════════════
// COACH DM — MacroBar
// 
// Barre horizontale animée pour protéines/glucides/lipides.
// Couleurs cohérentes avec PDFs (rouge/bleu/violet/vert).
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '@/theme';

interface Props {
  label: string;
  consumed: number;
  target: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, consumed, target, color, unit = 'g' }: Props) {
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(ratio * 100, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [ratio, animatedWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  const remaining = Math.max(0, target - consumed);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.label}>{label}</Text>
        <View style={styles.spacer} />
        <Text style={styles.value}>
          <Text style={[styles.valueBold, { color }]}>{Math.round(consumed)}</Text>
          <Text style={styles.valueDim}> / {Math.round(target)} {unit}</Text>
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { backgroundColor: color }, animatedStyle]}
        />
      </View>

      <Text style={styles.remaining}>
        {remaining > 0 ? `${Math.round(remaining)} ${unit} restants` : 'Objectif atteint'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing['4'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['2'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing['2'],
  },
  label: {
    fontSize: typography.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  spacer: { flex: 1 },
  value: {
    fontSize: typography.sm,
  },
  valueBold: {
    fontWeight: typography.weights.bold,
  },
  valueDim: {
    color: colors.textTertiary,
  },
  track: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  remaining: {
    fontSize: typography.xs,
    color: colors.textTertiary,
    marginTop: spacing['1'],
    fontWeight: typography.weights.medium,
  },
});
