// =====================================================================
// Coach DM · Phase 5 · MeasurementsChartScreen
// Mensurations : sélection multi-mesures + graphes individuels
// =====================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import {
  COACH_DM_COLORS,
  t,
  type Locale,
  type BodyMetric,
} from '@coachdm/shared/progression';
import { supabase } from '../../lib/supabase';
import { LineChart } from '../../components/progression/LineChart';

type MeasurementKey =
  | 'neck_cm'
  | 'chest_cm'
  | 'waist_cm'
  | 'hips_cm'
  | 'biceps_left_cm'
  | 'biceps_right_cm'
  | 'thigh_left_cm'
  | 'thigh_right_cm'
  | 'calf_left_cm'
  | 'calf_right_cm';

const MEASUREMENT_LABELS: Record<MeasurementKey, { fr: string; en: string; nl: string }> = {
  neck_cm: { fr: 'Cou', en: 'Neck', nl: 'Nek' },
  chest_cm: { fr: 'Poitrine', en: 'Chest', nl: 'Borst' },
  waist_cm: { fr: 'Taille', en: 'Waist', nl: 'Taille' },
  hips_cm: { fr: 'Hanches', en: 'Hips', nl: 'Heupen' },
  biceps_left_cm: { fr: 'Biceps G', en: 'Biceps L', nl: 'Biceps L' },
  biceps_right_cm: { fr: 'Biceps D', en: 'Biceps R', nl: 'Biceps R' },
  thigh_left_cm: { fr: 'Cuisse G', en: 'Thigh L', nl: 'Dij L' },
  thigh_right_cm: { fr: 'Cuisse D', en: 'Thigh R', nl: 'Dij R' },
  calf_left_cm: { fr: 'Mollet G', en: 'Calf L', nl: 'Kuit L' },
  calf_right_cm: { fr: 'Mollet D', en: 'Calf R', nl: 'Kuit R' },
};

interface Props {
  locale?: Locale;
}

export function MeasurementsChartScreen({ locale = 'fr' }: Props) {
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [active, setActive] = useState<MeasurementKey>('waist_cm');

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 365 * 86400000).toISOString();
      const { data } = await supabase
        .from('body_metrics')
        .select('*')
        .gte('measured_at', since)
        .order('measured_at', { ascending: true });
      if (data) setMetrics(data as BodyMetric[]);
    })();
  }, []);

  const chartData = useMemo(
    () =>
      metrics
        .filter((m) => m[active] !== null && m[active] !== undefined)
        .map((m) => ({
          x: new Date(m.measured_at).getTime(),
          y: m[active] as number,
        })),
    [metrics, active]
  );

  // Stats min/max/avg/delta pour la mesure active
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const ys = chartData.map((d) => d.y);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const avg = ys.reduce((a, b) => a + b, 0) / ys.length;
    const delta = ys[ys.length - 1] - ys[0];
    return { min, max, avg, delta };
  }, [chartData]);

  // Latest measurements (snapshot)
  const latest = metrics[metrics.length - 1];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('measurements', locale)}</Text>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {(Object.keys(MEASUREMENT_LABELS) as MeasurementKey[]).map((key) => (
          <Pressable
            key={key}
            style={[styles.tab, active === key && styles.tabActive]}
            onPress={() => setActive(key)}
          >
            <Text
              style={[
                styles.tabText,
                active === key && { color: COACH_DM_COLORS.bg, fontWeight: '700' },
              ]}
            >
              {MEASUREMENT_LABELS[key][locale]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <LineChart
        data={chartData}
        height={240}
        formatY={(v) => v.toFixed(1)}
        yLabel="cm"
      />

      {/* Stats actives */}
      {stats ? (
        <View style={styles.statBox}>
          <StatBlock label="Min" value={`${stats.min.toFixed(1)} cm`} />
          <StatBlock label="Moy" value={`${stats.avg.toFixed(1)} cm`} />
          <StatBlock label="Max" value={`${stats.max.toFixed(1)} cm`} />
          <StatBlock
            label="Δ"
            value={`${stats.delta > 0 ? '+' : ''}${stats.delta.toFixed(1)} cm`}
            color={
              stats.delta > 0
                ? COACH_DM_COLORS.gold
                : stats.delta < 0
                ? COACH_DM_COLORS.green
                : COACH_DM_COLORS.textPrimary
            }
          />
        </View>
      ) : null}

      {/* Snapshot dernières mesures */}
      {latest ? (
        <View style={styles.snapshot}>
          <Text style={styles.snapshotTitle}>Dernières mesures</Text>
          {(Object.keys(MEASUREMENT_LABELS) as MeasurementKey[]).map((key) => (
            <View key={key} style={styles.snapshotRow}>
              <Text style={styles.snapshotLabel}>
                {MEASUREMENT_LABELS[key][locale]}
              </Text>
              <Text style={styles.snapshotValue}>
                {latest[key] !== null ? `${(latest[key] as number).toFixed(1)} cm` : '—'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  content: { padding: 16, paddingBottom: 80 },
  title: { color: COACH_DM_COLORS.gold, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  tabs: { gap: 6, paddingVertical: 4, marginBottom: 8 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 16,
  },
  tabActive: { backgroundColor: COACH_DM_COLORS.gold },
  tabText: { color: COACH_DM_COLORS.textPrimary, fontSize: 12 },
  statBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  stat: { alignItems: 'center', flex: 1 },
  statLabel: { color: COACH_DM_COLORS.textSecondary, fontSize: 11 },
  statValue: {
    color: COACH_DM_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  snapshot: {
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  snapshotTitle: {
    color: COACH_DM_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COACH_DM_COLORS.border,
  },
  snapshotLabel: { color: COACH_DM_COLORS.textSecondary, fontSize: 12 },
  snapshotValue: { color: COACH_DM_COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
});
