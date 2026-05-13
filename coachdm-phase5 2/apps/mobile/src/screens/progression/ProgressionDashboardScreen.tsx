// =====================================================================
// Coach DM · Phase 5 · ProgressionDashboardScreen
// Vue d'ensemble : poids, dernier PR, calendrier mini, plateau warning
// =====================================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  COACH_DM_COLORS,
  t,
  formatWeightDelta,
  formatPRValue,
  formatDate,
  computePlateauDetection,
  type Locale,
  type BodyMetric,
  type BodyMetricsWeekly,
  type PersonalRecord,
  type DailyActivity,
  type PlateauDetection,
} from '@coachdm/shared/progression';
import { supabase } from '../../lib/supabase';
import { LineChart } from '../../components/progression/LineChart';
import { ActivityHeatmap } from '../../components/progression/ActivityHeatmap';
import { InsightCard } from '../../components/progression/InsightCard';

type ProgressionStackParams = {
  ProgressionDashboard: undefined;
  WeightChart: undefined;
  MeasurementsChart: undefined;
  PerformanceChart: undefined;
  ActivityCalendar: undefined;
  PRsList: undefined;
  PhotoComparison: undefined;
  MonthlyReport: undefined;
};

interface Props {
  navigation: NativeStackNavigationProp<ProgressionStackParams, 'ProgressionDashboard'>;
  locale?: Locale;
}

export function ProgressionDashboardScreen({ navigation, locale = 'fr' }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentMetrics, setRecentMetrics] = useState<BodyMetric[]>([]);
  const [weekly, setWeekly] = useState<BodyMetricsWeekly[]>([]);
  const [recentPRs, setRecentPRs] = useState<PersonalRecord[]>([]);
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [plateau, setPlateau] = useState<PlateauDetection | null>(null);

  const loadData = useCallback(async () => {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [metricsRes, weeklyRes, prsRes, actsRes] = await Promise.all([
      supabase
        .from('body_metrics')
        .select('*')
        .gte('measured_at', since30d)
        .order('measured_at', { ascending: false })
        .limit(60),
      supabase
        .from('body_metrics_weekly')
        .select('*')
        .order('week_start', { ascending: true }),
      supabase
        .from('personal_records')
        .select('*')
        .order('achieved_at', { ascending: false })
        .limit(5),
      supabase
        .from('daily_activity')
        .select('*')
        .gte('day', since90d)
        .order('day', { ascending: true }),
    ]);

    if (metricsRes.data) setRecentMetrics(metricsRes.data as BodyMetric[]);
    if (weeklyRes.data) {
      setWeekly(weeklyRes.data as BodyMetricsWeekly[]);
      setPlateau(computePlateauDetection(weeklyRes.data as BodyMetricsWeekly[]));
    }
    if (prsRes.data) setRecentPRs(prsRes.data as PersonalRecord[]);
    if (actsRes.data) setActivities(actsRes.data as DailyActivity[]);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Calcul delta poids 30j
  const latestWeight = recentMetrics.find((m) => m.weight_kg !== null)?.weight_kg ?? null;
  const oldestWeight = [...recentMetrics]
    .reverse()
    .find((m) => m.weight_kg !== null)?.weight_kg ?? null;
  const deltaWeight =
    latestWeight !== null && oldestWeight !== null
      ? Math.round((latestWeight - oldestWeight) * 100) / 100
      : null;

  const chartData = recentMetrics
    .filter((m) => m.weight_kg !== null)
    .map((m) => ({
      x: new Date(m.measured_at).getTime(),
      y: m.weight_kg as number,
    }))
    .sort((a, b) => a.x - b.x);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COACH_DM_COLORS.gold}
        />
      }
    >
      <Text style={styles.title}>{t('progression', locale)}</Text>

      {/* KPI cards */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>{t('weight', locale)}</Text>
          <Text style={styles.kpiValue}>
            {latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : '—'}
          </Text>
          {deltaWeight !== null ? (
            <Text
              style={[
                styles.kpiDelta,
                {
                  color:
                    deltaWeight > 0
                      ? COACH_DM_COLORS.red
                      : deltaWeight < 0
                      ? COACH_DM_COLORS.green
                      : COACH_DM_COLORS.textSecondary,
                },
              ]}
            >
              {formatWeightDelta(deltaWeight, locale)} · 30j
            </Text>
          ) : null}
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>{t('personal_records', locale)}</Text>
          <Text style={styles.kpiValue}>{recentPRs.length}</Text>
          {recentPRs[0] ? (
            <Text style={styles.kpiDelta}>
              {formatDate(recentPRs[0].achieved_at, locale)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Plateau warning */}
      {plateau?.is_plateau && plateau.recommendation ? (
        <InsightCard insight={plateau.recommendation} locale={locale} />
      ) : null}

      {/* Mini graphe poids */}
      <Pressable onPress={() => navigation.navigate('WeightChart')}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('weight', locale)}</Text>
            <Text style={styles.linkText}>{t('see_all', locale)} →</Text>
          </View>
          <LineChart data={chartData} height={180} formatY={(v) => `${v.toFixed(1)}`} />
        </View>
      </Pressable>

      {/* Mini calendrier 90j */}
      <Pressable onPress={() => navigation.navigate('ActivityCalendar')}>
        <ActivityHeatmap activities={activities} locale={locale} days={90} />
      </Pressable>

      {/* Records récents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('personal_records', locale)}</Text>
          <Pressable onPress={() => navigation.navigate('PRsList')}>
            <Text style={styles.linkText}>{t('see_all', locale)} →</Text>
          </Pressable>
        </View>
        {recentPRs.length === 0 ? (
          <Text style={styles.empty}>{t('no_prs_yet', locale)}</Text>
        ) : (
          recentPRs.map((pr) => (
            <View key={pr.id} style={styles.prRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prTitle}>
                  {pr.exercise_name ?? pr.activity_type ?? pr.category}
                </Text>
                <Text style={styles.prSub}>
                  {formatDate(pr.achieved_at, locale)}
                </Text>
              </View>
              <Text style={styles.prValue}>
                {formatPRValue(pr.category, pr.value, pr.unit)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Liens vers détails */}
      <View style={styles.section}>
        <NavLink
          label={t('measurements', locale)}
          onPress={() => navigation.navigate('MeasurementsChart')}
        />
        <NavLink
          label={t('pr_strength', locale)}
          onPress={() => navigation.navigate('PerformanceChart')}
        />
        <NavLink
          label={t('progress_photos', locale)}
          onPress={() => navigation.navigate('PhotoComparison')}
        />
        <NavLink
          label={t('monthly_report', locale)}
          onPress={() => navigation.navigate('MonthlyReport')}
        />
      </View>
    </ScrollView>
  );
}

function NavLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.navLink} onPress={onPress}>
      <Text style={styles.navLinkText}>{label}</Text>
      <Text style={styles.navLinkArrow}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  content: { padding: 16, paddingBottom: 80 },
  title: {
    color: COACH_DM_COLORS.gold,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
  },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    backgroundColor: COACH_DM_COLORS.cardBg,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  kpiLabel: { color: COACH_DM_COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
  kpiValue: { color: COACH_DM_COLORS.textPrimary, fontSize: 22, fontWeight: '700' },
  kpiDelta: { fontSize: 11, marginTop: 4 },
  section: { marginVertical: 6 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: COACH_DM_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  linkText: { color: COACH_DM_COLORS.gold, fontSize: 12 },
  empty: { color: COACH_DM_COLORS.textSecondary, fontSize: 13, padding: 12 },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COACH_DM_COLORS.cardBg,
    padding: 12,
    borderRadius: 8,
    marginVertical: 3,
  },
  prTitle: { color: COACH_DM_COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  prSub: { color: COACH_DM_COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  prValue: { color: COACH_DM_COLORS.gold, fontSize: 16, fontWeight: '700' },
  navLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 8,
    marginVertical: 3,
  },
  navLinkText: { color: COACH_DM_COLORS.textPrimary, fontSize: 14 },
  navLinkArrow: { color: COACH_DM_COLORS.gold, fontSize: 16 },
});
