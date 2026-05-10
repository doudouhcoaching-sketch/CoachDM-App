// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Mobile · RecoveryDashboardScreen
// ═══════════════════════════════════════════════════════════════════════════
// Hub central : Recovery Score + 3 cartes (sommeil, hydratation, habits) + streaks
// Code couleur : or #D4AF37, vert insight, rouge warning, bleu info, violet tactic
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { theme } from '../../lib/theme';
import { CDMIcon } from '../../components/CDMIcon';
import {
  computeRecoveryScore,
  hydrationStatus,
  formatDuration,
} from '@coachdm/shared/recovery';
import type {
  SleepSession, HydrationDaily, HydrationTarget,
  Habit, HabitLog, RecoveryStreaks,
} from '@coachdm/shared/recovery';

type Props = NativeStackScreenProps<any, 'RecoveryDashboard'>;

export function RecoveryDashboardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [streaks, setStreaks] = useState<RecoveryStreaks | null>(null);
  const [sleepRecent, setSleepRecent] = useState<SleepSession[]>([]);
  const [hydrationToday, setHydrationToday] = useState<HydrationDaily | null>(null);
  const [hydrationTarget, setHydrationTarget] = useState<HydrationTarget | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogsToday, setHabitLogsToday] = useState<HabitLog[]>([]);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

      const [streakRes, sleepRes, hydDailyRes, hydTargetRes, habitsRes, logsRes] = await Promise.all([
        supabase.from('recovery_streaks').select('*').eq('user_id', user.id).single(),
        supabase.from('sleep_sessions')
          .select('*').eq('user_id', user.id)
          .gte('sleep_date', sevenAgoStr)
          .order('sleep_date', { ascending: false }),
        supabase.from('hydration_daily')
          .select('*').eq('user_id', user.id).eq('drank_date', today).maybeSingle(),
        supabase.from('hydration_targets').select('*').eq('user_id', user.id).single(),
        supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false)
          .order('display_order'),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('log_date', today),
      ]);

      setStreaks(streakRes.data);
      setSleepRecent(sleepRes.data ?? []);
      setHydrationToday(hydDailyRes.data);
      setHydrationTarget(hydTargetRes.data);
      setHabits(habitsRes.data ?? []);
      setHabitLogsToday(logsRes.data ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // ─── Score temps réel ─────────────────────────────────────────────────────
  const score = useMemo(() => {
    const avgSleep = sleepRecent.length
      ? sleepRecent.reduce((s, x) => s + x.duration_min, 0) / sleepRecent.length
      : 0;
    const target = hydrationTarget?.target_ml ?? 2500;
    // Approximation : on regarde just today (la DB recalcule sur 7j)
    const reachedToday = (hydrationToday?.total_ml ?? 0) >= target ? 1 : 0;
    return computeRecoveryScore({
      avgSleepMin: avgSleep,
      daysHydrationTargetMet: streaks?.hydration_current ? Math.min(7, streaks.hydration_current) : reachedToday,
      habitsActiveCount: habits.length,
      habitLogsLast7d: habitLogsToday.length * 7, // approximation
    });
  }, [sleepRecent, hydrationToday, hydrationTarget, habits, habitLogsToday, streaks]);

  // Préfère le score serveur (plus précis)
  const displayScore = streaks?.recovery_score ?? score.total;

  // ─── Status sommeil aujourd'hui ───────────────────────────────────────────
  const lastNight = sleepRecent[0];
  const lastNightLogged = lastNight && lastNight.sleep_date === today;

  // ─── Hydratation ──────────────────────────────────────────────────────────
  const hydStatus = hydrationStatus(
    hydrationToday?.total_ml ?? 0,
    hydrationTarget?.target_ml ?? 2500
  );

  // ─── Habits du jour ───────────────────────────────────────────────────────
  const dow = (() => {
    const js = new Date().getDay();
    return js === 0 ? 7 : js;
  })();
  const todaysHabits = habits.filter((h) => h.active_days?.includes(dow));
  const doneHabits = new Set(habitLogsToday.map((l) => l.habit_id));
  const habitsDoneCount = todaysHabits.filter((h) => doneHabits.has(h.id)).length;

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.gold} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
    >
      <Text style={styles.title}>{t('recovery.score.title')}</Text>

      {/* ─── Recovery Score ──────────────────────────────────────────────── */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreRingWrap}>
          <ScoreRing value={displayScore} />
        </View>
        <View style={styles.scoreBreakdown}>
          <BreakdownRow label={t('recovery.score.breakdown_sleep')} value={score.sleep} max={40} color={theme.blue} />
          <BreakdownRow label={t('recovery.score.breakdown_hydration')} value={score.hydration} max={30} color="#38BDF8" />
          <BreakdownRow label={t('recovery.score.breakdown_habits')} value={score.habits} max={30} color={theme.violet} />
        </View>
      </View>

      {/* ─── Streaks ─────────────────────────────────────────────────────── */}
      {streaks && (
        <View style={styles.streaksRow}>
          <StreakChip
            icon="moon"
            label={t('recovery.streaks.sleep_streak')}
            current={streaks.sleep_current}
            best={streaks.sleep_best}
          />
          <StreakChip
            icon="droplet"
            label={t('recovery.streaks.hydration_streak')}
            current={streaks.hydration_current}
            best={streaks.hydration_best}
          />
          <StreakChip
            icon="zap"
            label={t('recovery.streaks.habits_streak')}
            current={streaks.habits_current}
            best={streaks.habits_best}
          />
        </View>
      )}

      {/* ─── Carte Sommeil ────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Sleep')}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <CDMIcon name="moon" size={20} color={theme.gold} />
          <Text style={styles.cardTitle}>{t('recovery.sleep.title')}</Text>
          <Text style={styles.cardChevron}>›</Text>
        </View>
        {lastNightLogged ? (
          <View style={styles.cardBody}>
            <Text style={styles.cardMain}>{formatDuration(lastNight.duration_min)}</Text>
            {lastNight.quality !== null && (
              <Text style={styles.cardSecondary}>
                {t('recovery.sleep.quality')}: {'★'.repeat(lastNight.quality)}{'☆'.repeat(5 - lastNight.quality)}
              </Text>
            )}
            {lastNight.hrv_rmssd_ms !== null && (
              <Text style={styles.cardSecondary}>HRV: {Math.round(lastNight.hrv_rmssd_ms)} ms</Text>
            )}
          </View>
        ) : (
          <View style={styles.cardBody}>
            <Text style={styles.cardMain}>—</Text>
            <Text style={styles.cardCta}>{t('recovery.sleep.log_night')}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ─── Carte Hydratation ────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Hydration')}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <CDMIcon name="droplet" size={20} color="#38BDF8" />
          <Text style={styles.cardTitle}>{t('recovery.hydration.title')}</Text>
          <Text style={styles.cardChevron}>›</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardMain}>
            {(hydStatus.total_ml / 1000).toFixed(1)} / {(hydStatus.target_ml / 1000).toFixed(1)} L
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, hydStatus.percent)}%`, backgroundColor: '#38BDF8' },
              ]}
            />
          </View>
          <Text style={styles.cardSecondary}>{hydStatus.percent}%</Text>
        </View>
      </TouchableOpacity>

      {/* ─── Carte Habits ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Habits')}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <CDMIcon name="zap" size={20} color={theme.violet} />
          <Text style={styles.cardTitle}>{t('recovery.habits.title')}</Text>
          <Text style={styles.cardChevron}>›</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardMain}>{habitsDoneCount} / {todaysHabits.length}</Text>
          <Text style={styles.cardSecondary}>
            {todaysHabits.length === 0
              ? t('recovery.habits.no_habits')
              : `${Math.round((habitsDoneCount / Math.max(1, todaysHabits.length)) * 100)}%`}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScoreRing({ value }: { value: number }) {
  // SVG ring serait idéal ; ici version View pour rester sans dépendance svg
  const color = value >= 80 ? theme.green : value >= 60 ? theme.gold : value >= 40 ? '#38BDF8' : theme.red;
  return (
    <View style={[styles.scoreRing, { borderColor: color }]}>
      <Text style={[styles.scoreValue, { color }]}>{value}</Text>
      <Text style={styles.scoreOver}>/100</Text>
    </View>
  );
}

function BreakdownRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <View style={styles.breakdownBarBg}>
        <View style={[styles.breakdownBarFill, { width: `${(value / max) * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.breakdownValue}>{value}/{max}</Text>
    </View>
  );
}

function StreakChip({ icon, label, current, best }: { icon: string; label: string; current: number; best: number }) {
  return (
    <View style={styles.streakChip}>
      <CDMIcon name={icon} size={16} color={theme.gold} />
      <Text style={styles.streakValue}>{current}</Text>
      <Text style={styles.streakLabel}>{label}</Text>
      <Text style={styles.streakBest}>★ {best}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },

  title: {
    color: theme.gold,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: -0.5,
  },

  // Score card
  scoreCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.gold + '33',
  },
  scoreRingWrap: { marginRight: 20 },
  scoreRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: { fontSize: 32, fontWeight: '900' },
  scoreOver: { fontSize: 11, color: theme.muted, marginTop: -4 },
  scoreBreakdown: { flex: 1 },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  breakdownLabel: { color: theme.text, fontSize: 12, width: 80 },
  breakdownBarBg: { flex: 1, height: 6, backgroundColor: theme.muted + '33', borderRadius: 3, marginHorizontal: 8 },
  breakdownBarFill: { height: 6, borderRadius: 3 },
  breakdownValue: { color: theme.muted, fontSize: 11, width: 40, textAlign: 'right' },

  // Streaks
  streaksRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  streakChip: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.muted + '22',
  },
  streakValue: { color: theme.gold, fontSize: 24, fontWeight: '900', marginTop: 4 },
  streakLabel: { color: theme.muted, fontSize: 10, textAlign: 'center', marginTop: 2 },
  streakBest: { color: theme.muted, fontSize: 10, marginTop: 4 },

  // Cards
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.muted + '22',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginLeft: 8, flex: 1 },
  cardChevron: { color: theme.muted, fontSize: 24 },
  cardBody: {},
  cardMain: { color: theme.text, fontSize: 28, fontWeight: '900' },
  cardSecondary: { color: theme.muted, fontSize: 13, marginTop: 4 },
  cardCta: { color: theme.gold, fontSize: 13, fontWeight: '700', marginTop: 4 },

  progressBarBg: {
    height: 8,
    backgroundColor: theme.muted + '33',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: { height: 8, borderRadius: 4 },
});
