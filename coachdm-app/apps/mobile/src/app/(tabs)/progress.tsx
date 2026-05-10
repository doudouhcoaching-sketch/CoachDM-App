// ═══════════════════════════════════════════════════════════════
// COACH DM — Progress
// 
// Graphe poids 90 jours + stats. Pas de lib externe lourde,
// graphe SVG custom pour rester premium et léger.
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui';
import { useWeightHistory } from '@/hooks/useNutrition';
import { colors, typography, spacing, radius } from '@/theme';

const CHART_W = 320;
const CHART_H = 180;
const PADDING = 24;

export default function ProgressScreen() {
  const { data: weights = [] } = useWeightHistory(90);

  const chart = useMemo(() => {
    if (weights.length < 2) return null;

    const values = weights.map((w) => Number(w.weight_kg));
    const min = Math.min(...values) - 1;
    const max = Math.max(...values) + 1;
    const range = max - min;

    const xStep = (CHART_W - PADDING * 2) / (weights.length - 1);

    const points = weights.map((w, i) => {
      const x = PADDING + i * xStep;
      const y =
        PADDING +
        (CHART_H - PADDING * 2) -
        ((Number(w.weight_kg) - min) / range) * (CHART_H - PADDING * 2);
      return { x, y, weight: Number(w.weight_kg), date: w.logged_date };
    });

    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
    return { points, polyline, min, max };
  }, [weights]);

  const stats = useMemo(() => {
    if (weights.length === 0) return null;
    const first = Number(weights[0]!.weight_kg);
    const last = Number(weights[weights.length - 1]!.weight_kg);
    const delta = last - first;
    const min = Math.min(...weights.map((w) => Number(w.weight_kg)));
    const max = Math.max(...weights.map((w) => Number(w.weight_kg)));
    return { first, last, delta, min, max };
  }, [weights]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Progrès</Text>
          <Text style={styles.subtitle}>90 derniers jours</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(modals)/log-weight')}
          style={styles.headerBtn}
        >
          <Ionicons name="add" size={24} color={colors.textOnPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Ionicons name="trending-up" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Évolution du poids</Text>
          </View>

          {chart ? (
            <View style={{ alignItems: 'center', marginTop: spacing['4'] }}>
              <Svg width={CHART_W} height={CHART_H}>
                {/* Lignes horizontales de référence */}
                {[0.25, 0.5, 0.75].map((r) => (
                  <Line
                    key={r}
                    x1={PADDING}
                    x2={CHART_W - PADDING}
                    y1={PADDING + (CHART_H - PADDING * 2) * r}
                    y2={PADDING + (CHART_H - PADDING * 2) * r}
                    stroke={colors.borderSubtle}
                    strokeDasharray="3,3"
                  />
                ))}

                {/* Ligne */}
                <Polyline
                  points={chart.polyline}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />

                {/* Points */}
                {chart.points.map((p, i) => (
                  <Circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill={colors.bg}
                    stroke={colors.primary}
                    strokeWidth={2}
                  />
                ))}

                {/* Labels min/max axe Y */}
                <SvgText
                  x={4}
                  y={PADDING + 4}
                  fill={colors.textTertiary}
                  fontSize="10"
                >
                  {chart.max.toFixed(1)}
                </SvgText>
                <SvgText
                  x={4}
                  y={CHART_H - PADDING + 4}
                  fill={colors.textTertiary}
                  fontSize="10"
                >
                  {chart.min.toFixed(1)}
                </SvgText>
              </Svg>
            </View>
          ) : (
            <View style={{ paddingVertical: spacing['10'], alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>
                Pèse-toi régulièrement pour voir ton évolution.
              </Text>
            </View>
          )}
        </Card>

        {stats && (
          <View style={styles.statsRow}>
            <StatBlock label="Actuel" value={`${stats.last.toFixed(1)} kg`} />
            <StatBlock
              label="Variation"
              value={`${stats.delta >= 0 ? '+' : ''}${stats.delta.toFixed(1)}`}
              accent={stats.delta < 0 ? colors.success : colors.danger}
            />
            <StatBlock label="Min" value={`${stats.min.toFixed(1)}`} />
            <StatBlock label="Max" value={`${stats.max.toFixed(1)}`} />
          </View>
        )}

        <Card style={styles.tipCard}>
          <Ionicons name="bulb" size={18} color={colors.primary} />
          <Text style={styles.tipText}>
            Pèse-toi à la même heure (au réveil, à jeun, après les toilettes) pour des données fiables.
          </Text>
        </Card>

        <View style={{ height: spacing['10'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statBlockLabel}>{label}</Text>
      <Text style={[styles.statBlockValue, accent && { color: accent }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['5'],
    paddingVertical: spacing['4'],
  },
  title: {
    color: colors.text,
    fontSize: typography.xl2,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: 2,
  },
  headerBtn: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: spacing['5'] },
  chartCard: { marginBottom: spacing['4'] },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.lg,
    fontWeight: typography.weights.bold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing['2'],
    marginBottom: spacing['4'],
  },
  statBlock: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing['3'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statBlockLabel: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statBlockValue: {
    color: colors.text,
    fontSize: typography.base,
    fontWeight: typography.weights.bold,
    marginTop: 4,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  tipText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: 20,
  },
});
