// =====================================================================
// Coach DM · Phase 5 · ActivityHeatmap (GitHub-style 365j)
// =====================================================================

import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import type { DailyActivity, Locale } from '@coachdm/shared/progression';
import { CALENDAR_INTENSITY_COLORS, COACH_DM_COLORS, t } from '@coachdm/shared/progression';

interface Props {
  activities: DailyActivity[];
  locale?: Locale;
  /** Nombre de jours à afficher en arrière (def 365) */
  days?: number;
  onDayPress?: (day: DailyActivity | null, date: string) => void;
}

const CELL_SIZE = 11;
const CELL_GAP = 2;

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ActivityHeatmap({ activities, locale = 'fr', days = 365, onDayPress }: Props) {
  const grid = useMemo(() => {
    const map = new Map<string, DailyActivity>();
    activities.forEach((a) => map.set(a.day, a));

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    // Aligner à dimanche pour avoir des semaines pleines
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    const dayOfWeekStart = start.getDay(); // 0=dim
    start.setDate(start.getDate() - dayOfWeekStart);

    const weeks: { date: string; activity: DailyActivity | null }[][] = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const week: { date: string; activity: DailyActivity | null }[] = [];
      for (let dow = 0; dow < 7; dow++) {
        const dateStr = isoDate(cursor);
        const inRange = cursor <= today;
        week.push({
          date: dateStr,
          activity: inRange ? map.get(dateStr) ?? null : null,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [activities, days]);

  const stats = useMemo(() => {
    const active = activities.filter((a) => a.intensity > 0);
    const sorted = [...active].sort((a, b) => b.day.localeCompare(a.day));
    let streak = 0;
    const today = isoDate(new Date());
    let cursor = new Date(today);
    while (true) {
      const ds = isoDate(cursor);
      const found = activities.find((a) => a.day === ds);
      if (found && found.intensity > 0) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (ds === today) {
        // Permet aujourd'hui sans interrompre la série
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return { activeDays: active.length, currentStreak: streak };
  }, [activities]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('activity_calendar', locale)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.activeDays}</Text>
            <Text style={styles.statLabel}>{t('total_active_days', locale)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: COACH_DM_COLORS.gold }]}>
              {stats.currentStreak}
            </Text>
            <Text style={styles.statLabel}>{t('current_streak', locale)}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.grid}>
          {grid.map((week, wIdx) => (
            <View key={wIdx} style={styles.week}>
              {week.map((cell, dIdx) => {
                const intensity = (cell.activity?.intensity ?? 0) as 0 | 1 | 2 | 3 | 4;
                return (
                  <Pressable
                    key={dIdx}
                    style={[
                      styles.cell,
                      { backgroundColor: CALENDAR_INTENSITY_COLORS[intensity] },
                    ]}
                    onPress={() => onDayPress?.(cell.activity, cell.date)}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Légende */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>{t('legend_less', locale)}</Text>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <View
            key={lvl}
            style={[
              styles.legendCell,
              { backgroundColor: CALENDAR_INTENSITY_COLORS[lvl as 0 | 1 | 2 | 3 | 4] },
            ]}
          />
        ))}
        <Text style={styles.legendText}>{t('legend_more', locale)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
  },
  header: { marginBottom: 12 },
  title: { color: COACH_DM_COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  stat: { alignItems: 'center' },
  statValue: { color: COACH_DM_COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  statLabel: { color: COACH_DM_COLORS.textSecondary, fontSize: 11 },
  scroll: { paddingVertical: 4 },
  grid: { flexDirection: 'row' },
  week: { gap: CELL_GAP, marginRight: CELL_GAP },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  legendText: { color: COACH_DM_COLORS.textSecondary, fontSize: 10 },
  legendCell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2 },
});
