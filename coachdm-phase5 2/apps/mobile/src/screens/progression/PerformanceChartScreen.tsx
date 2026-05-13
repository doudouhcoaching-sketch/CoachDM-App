// =====================================================================
// Coach DM · Phase 5 · PerformanceChartScreen
// Évolution 1RM par exercice principal
// =====================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import {
  COACH_DM_COLORS,
  t,
  formatPRValue,
  formatDate,
  type Locale,
  type PersonalRecord,
} from '@coachdm/shared/progression';
import { supabase } from '../../lib/supabase';
import { LineChart } from '../../components/progression/LineChart';

interface Props {
  locale?: Locale;
}

export function PerformanceChartScreen({ locale = 'fr' }: Props) {
  const [allPRs, setAllPRs] = useState<PersonalRecord[]>([]);
  const [activeExId, setActiveExId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 365 * 86400000).toISOString();
      const { data } = await supabase
        .from('personal_records')
        .select('*')
        .eq('category', 'strength_1rm')
        .gte('achieved_at', since)
        .order('achieved_at', { ascending: true });
      if (data) {
        const prs = data as PersonalRecord[];
        setAllPRs(prs);
        if (prs.length > 0 && activeExId === null) {
          setActiveExId(prs[prs.length - 1].exercise_id);
        }
      }
    })();
  }, []);

  // Group PRs par exercise_id
  const exercises = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; latest: number }>();
    for (const pr of allPRs) {
      if (!pr.exercise_id) continue;
      const existing = map.get(pr.exercise_id);
      if (existing) {
        existing.count++;
        existing.latest = pr.value;
      } else {
        map.set(pr.exercise_id, {
          id: pr.exercise_id,
          name: pr.exercise_name ?? pr.exercise_id,
          count: 1,
          latest: pr.value,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allPRs]);

  const chartData = useMemo(() => {
    if (!activeExId) return [];
    return allPRs
      .filter((p) => p.exercise_id === activeExId)
      .map((p) => ({ x: new Date(p.achieved_at).getTime(), y: p.value }));
  }, [allPRs, activeExId]);

  const activeName = exercises.find((e) => e.id === activeExId)?.name ?? '';
  const allTimePR = chartData.length > 0 ? Math.max(...chartData.map((d) => d.y)) : null;
  const firstValue = chartData.length > 0 ? chartData[0].y : null;
  const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].y : null;
  const delta =
    firstValue !== null && latestValue !== null
      ? Math.round((latestValue - firstValue) * 100) / 100
      : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('pr_strength', locale)}</Text>
      <Text style={styles.subtitle}>{t('pr_1rm', locale)}</Text>

      {exercises.length === 0 ? (
        <Text style={styles.empty}>{t('no_prs_yet', locale)}</Text>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {exercises.map((ex) => (
              <Pressable
                key={ex.id}
                style={[styles.tab, activeExId === ex.id && styles.tabActive]}
                onPress={() => setActiveExId(ex.id)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeExId === ex.id && { color: COACH_DM_COLORS.bg, fontWeight: '700' },
                  ]}
                >
                  {ex.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.exTitle}>{activeName}</Text>

          <LineChart data={chartData} height={240} formatY={(v) => v.toFixed(1)} yLabel="kg" />

          <View style={styles.statBox}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>1RM</Text>
              <Text style={[styles.statValue, { color: COACH_DM_COLORS.gold }]}>
                {allTimePR !== null ? `${allTimePR.toFixed(1)} kg` : '—'}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Δ</Text>
              <Text
                style={[
                  styles.statValue,
                  delta !== null && delta > 0
                    ? { color: COACH_DM_COLORS.green }
                    : delta !== null && delta < 0
                    ? { color: COACH_DM_COLORS.red }
                    : null,
                ]}
              >
                {delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg` : '—'}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>N</Text>
              <Text style={styles.statValue}>{chartData.length}</Text>
            </View>
          </View>

          <Text style={styles.histTitle}>Historique</Text>
          {[...chartData].reverse().slice(0, 20).map((d, i) => {
            const pr = allPRs.find(
              (p) => p.exercise_id === activeExId && new Date(p.achieved_at).getTime() === d.x
            );
            if (!pr) return null;
            return (
              <View key={`${d.x}-${i}`} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowDate}>{formatDate(pr.achieved_at, locale)}</Text>
                  <Text style={styles.rowSub}>
                    {pr.calc_method === 'actual'
                      ? `1RM réel · ${pr.reps ?? 1} rep`
                      : `${pr.calc_method} · ${pr.load_kg}kg × ${pr.reps} reps`}
                  </Text>
                </View>
                <Text style={styles.rowValue}>{formatPRValue(pr.category, pr.value, pr.unit)}</Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  content: { padding: 16, paddingBottom: 80 },
  title: { color: COACH_DM_COLORS.gold, fontSize: 24, fontWeight: '800' },
  subtitle: { color: COACH_DM_COLORS.textSecondary, fontSize: 13, marginBottom: 12 },
  empty: {
    color: COACH_DM_COLORS.textSecondary,
    textAlign: 'center',
    padding: 24,
    fontSize: 13,
  },
  tabs: { gap: 6, paddingVertical: 4, marginBottom: 8 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 16,
  },
  tabActive: { backgroundColor: COACH_DM_COLORS.gold },
  tabText: { color: COACH_DM_COLORS.textPrimary, fontSize: 12 },
  exTitle: {
    color: COACH_DM_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 8,
  },
  statBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  stat: { alignItems: 'center' },
  statLabel: { color: COACH_DM_COLORS.textSecondary, fontSize: 11 },
  statValue: {
    color: COACH_DM_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  histTitle: {
    color: COACH_DM_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COACH_DM_COLORS.cardBg,
    padding: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  rowDate: { color: COACH_DM_COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  rowSub: { color: COACH_DM_COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  rowValue: { color: COACH_DM_COLORS.gold, fontSize: 14, fontWeight: '700' },
});
