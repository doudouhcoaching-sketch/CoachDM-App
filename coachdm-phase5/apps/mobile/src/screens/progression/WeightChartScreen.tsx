// =====================================================================
// Coach DM · Phase 5 · WeightChartScreen
// Graphe poids 30j / 3m / 12m / Tout
// =====================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import {
  COACH_DM_COLORS,
  t,
  formatWeightDelta,
  formatDate,
  computePlateauDetection,
  type Locale,
  type BodyMetric,
  type BodyMetricsWeekly,
} from '@coachdm/shared/progression';
import { supabase } from '../../lib/supabase';
import { LineChart } from '../../components/progression/LineChart';
import { InsightCard } from '../../components/progression/InsightCard';

type Period = '30d' | '3m' | '1y' | 'all';

interface Props {
  locale?: Locale;
}

const PERIOD_DAYS: Record<Period, number | null> = {
  '30d': 30,
  '3m': 90,
  '1y': 365,
  all: null,
};

export function WeightChartScreen({ locale = 'fr' }: Props) {
  const [period, setPeriod] = useState<Period>('30d');
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [weekly, setWeekly] = useState<BodyMetricsWeekly[]>([]);

  useEffect(() => {
    (async () => {
      const days = PERIOD_DAYS[period];
      let q = supabase.from('body_metrics').select('*').not('weight_kg', 'is', null);
      if (days !== null) {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        q = q.gte('measured_at', since);
      }
      q = q.order('measured_at', { ascending: true });
      const { data } = await q;
      if (data) setMetrics(data as BodyMetric[]);

      const wkRes = await supabase
        .from('body_metrics_weekly')
        .select('*')
        .order('week_start', { ascending: true });
      if (wkRes.data) setWeekly(wkRes.data as BodyMetricsWeekly[]);
    })();
  }, [period]);

  const chartData = useMemo(
    () =>
      metrics.map((m) => ({
        x: new Date(m.measured_at).getTime(),
        y: m.weight_kg as number,
      })),
    [metrics]
  );

  const stats = useMemo(() => {
    if (metrics.length === 0) return null;
    const weights = metrics.map((m) => m.weight_kg as number);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    const delta = weights[weights.length - 1] - weights[0];
    return { min, max, avg, delta, count: weights.length };
  }, [metrics]);

  const plateau = useMemo(() => computePlateauDetection(weekly), [weekly]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('weight', locale)}</Text>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {(['30d', '3m', '1y', 'all'] as Period[]).map((p) => (
          <Pressable
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[
                styles.periodTxt,
                period === p && { color: COACH_DM_COLORS.bg, fontWeight: '700' },
              ]}
            >
              {p === '30d'
                ? t('last_30_days', locale)
                : p === '3m'
                ? t('last_3_months', locale)
                : p === '1y'
                ? t('last_year', locale)
                : t('all_time', locale)}
            </Text>
          </Pressable>
        ))}
      </View>

      <LineChart
        data={chartData}
        height={260}
        formatY={(v) => `${v.toFixed(1)}`}
        yLabel="kg"
      />

      {/* Stats */}
      {stats ? (
        <View style={styles.statsBox}>
          <StatRow label={t('weight', locale)} value={`${stats.avg.toFixed(1)} kg`} sub="moy." />
          <StatRow
            label="Δ"
            value={formatWeightDelta(stats.delta, locale)}
            color={
              stats.delta > 0
                ? COACH_DM_COLORS.red
                : stats.delta < 0
                ? COACH_DM_COLORS.green
                : COACH_DM_COLORS.textPrimary
            }
          />
          <StatRow label="Min" value={`${stats.min.toFixed(1)} kg`} />
          <StatRow label="Max" value={`${stats.max.toFixed(1)} kg`} />
          <StatRow label="N" value={`${stats.count}`} />
        </View>
      ) : null}

      {/* Plateau insight */}
      {plateau.recommendation ? (
        <InsightCard insight={plateau.recommendation} locale={locale} />
      ) : null}

      {/* Liste */}
      <Text style={styles.subTitle}>Historique</Text>
      {metrics
        .slice()
        .reverse()
        .slice(0, 30)
        .map((m) => (
          <View key={m.id} style={styles.row}>
            <Text style={styles.rowDate}>{formatDate(m.measured_at, locale)}</Text>
            <Text style={styles.rowValue}>{m.weight_kg?.toFixed(1)} kg</Text>
          </View>
        ))}
    </ScrollView>
  );
}

function StatRow({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  content: { padding: 16, paddingBottom: 80 },
  title: { color: COACH_DM_COLORS.gold, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  subTitle: {
    color: COACH_DM_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COACH_DM_COLORS.cardBg,
    alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: COACH_DM_COLORS.gold },
  periodTxt: { color: COACH_DM_COLORS.textPrimary, fontSize: 12 },
  statsBox: {
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statLabel: { color: COACH_DM_COLORS.textSecondary, fontSize: 13 },
  statValue: { color: COACH_DM_COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  statSub: { color: COACH_DM_COLORS.textSecondary, fontSize: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COACH_DM_COLORS.cardBg,
    marginVertical: 2,
    borderRadius: 8,
  },
  rowDate: { color: COACH_DM_COLORS.textSecondary, fontSize: 13 },
  rowValue: { color: COACH_DM_COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
});
