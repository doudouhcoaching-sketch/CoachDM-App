// ═══════════════════════════════════════════════════════════════
// COACH DM — CalorieRing
// 
// Anneau circulaire animé pour les calories. Style Apple Health /
// Future. Animation d'entrée smooth via Reanimated.
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function CalorieRing({
  consumed,
  target,
  size = 220,
  strokeWidth = 14,
  label = 'kcal',
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = target > 0 ? Math.min(consumed / target, 1.2) : 0;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animatedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  const remaining = Math.max(0, target - consumed);
  const isOver = consumed > target;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
            <Stop offset="1" stopColor="#F4D778" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isOver ? colors.danger : 'url(#ringGradient)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${circumference}, ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.content}>
        <Text style={styles.bigNumber}>{Math.round(remaining)}</Text>
        <Text style={styles.label}>{remaining > 0 ? 'restantes' : 'dépassées'}</Text>
        <View style={styles.divider} />
        <Text style={styles.subValue}>
          {Math.round(consumed)} <Text style={styles.subLight}>/ {Math.round(target)} {label}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigNumber: {
    fontSize: typography.xl5,
    fontWeight: typography.weights.black,
    color: colors.text,
    letterSpacing: -2,
  },
  label: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginTop: -spacing['1'],
    textTransform: 'lowercase',
  },
  divider: {
    width: 32,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing['2'],
  },
  subValue: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  subLight: {
    color: colors.textTertiary,
    fontWeight: typography.weights.regular,
  },
});
