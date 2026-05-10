// =====================================================================
// Coach DM · Phase 5 · ActivityCalendarScreen
// Calendrier 365j + détail jour sélectionné
// =====================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import {
  COACH_DM_COLORS,
  t,
  type Locale,
  type DailyActivity,
  formatDate,
} from '@coachdm/shared/progression';
import { supabase } from '../../lib/supabase';
import { ActivityHeatmap } from '../../components/progression/ActivityHeatmap';

interface Props {
  locale?: Locale;
}

export function ActivityCalendarScreen({ locale = 'fr' }: Props) {
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [selected, setSelected] = useState<{ day: DailyActivity | null; date: string } | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('daily_activity')
        .select('*')
        .gte('day', since)
        .order('day', { ascending: true });
      if (data) setActivities(data as DailyActivity[]);
    })();
  }, []);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('activity_calendar', locale)}</Text>

      <ActivityHeatmap
        activities={activities}
        locale={locale}
        days={365}
        onDayPress={(day, date) => setSelected({ day, date })}
      />

      {selected ? (
        <View style={styles.detail}>
          <Text style={styles.detailDate}>
            {formatDate(selected.date + 'T12:00:00Z', locale)}
          </Text>
          {selected.day ? (
            <View style={styles.detailGrid}>
              <DetailStat
                label="Workouts"
                value={`${selected.day.workout_count}`}
                sub={`${selected.day.workout_minutes} min`}
              />
              <DetailStat
                label="Cardio"
                value={`${selected.day.cardio_count}`}
                sub={`${selected.day.cardio_minutes} min`}
              />
              <DetailStat label="Habitudes" value={`${selected.day.habits_done}`} />
              <DetailStat label="Hydratation" value={`${selected.day.hydra_ml} ml`} />
            </View>
          ) : (
            <Text style={styles.detailEmpty}>Aucune activité enregistrée ce jour.</Text>
          )}
        </View>
      ) : null}

      <Text style={styles.subtitle}>Échelle d'intensité</Text>
      <View style={styles.scale}>
        <ScaleRow
          color={COACH_DM_COLORS.bg}
          label="0 — Repos complet"
          desc="Aucune activité enregistrée"
        />
        <ScaleRow color="#3B2F0E" label="1 — Légère" desc="Habitude ou hydratation ≥ 1L" />
        <ScaleRow color="#7A5F1C" label="2 — Modérée" desc="1 workout court ou cardio < 45min" />
        <ScaleRow color="#B89030" label="3 — Forte" desc="Workout complet ou cardio long" />
        <ScaleRow
          color={COACH_DM_COLORS.gold}
          label="4 — Intense"
          desc="Workout + cardio + recovery solide"
        />
      </View>
    </ScrollView>
  );
}

function DetailStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.detailStat}>
      <Text style={styles.detailStatLabel}>{label}</Text>
      <Text style={styles.detailStatValue}>{value}</Text>
      {sub ? <Text style={styles.detailStatSub}>{sub}</Text> : null}
    </View>
  );
}

function ScaleRow({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <View style={styles.scaleRow}>
      <View style={[styles.scaleSwatch, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.scaleLabel}>{label}</Text>
        <Text style={styles.scaleDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  content: { padding: 16, paddingBottom: 80 },
  title: { color: COACH_DM_COLORS.gold, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  subtitle: {
    color: COACH_DM_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  detail: {
    backgroundColor: COACH_DM_COLORS.cardBg,
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: COACH_DM_COLORS.gold,
  },
  detailDate: {
    color: COACH_DM_COLORS.gold,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  detailStat: { alignItems: 'center', width: '50%', paddingVertical: 6 },
  detailStatLabel: { color: COACH_DM_COLORS.textSecondary, fontSize: 11 },
  detailStatValue: { color: COACH_DM_COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  detailStatSub: { color: COACH_DM_COLORS.textSecondary, fontSize: 11 },
  detailEmpty: { color: COACH_DM_COLORS.textSecondary, fontSize: 12, fontStyle: 'italic' },
  scale: { backgroundColor: COACH_DM_COLORS.cardBg, borderRadius: 12, padding: 12 },
  scaleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  scaleSwatch: { width: 18, height: 18, borderRadius: 4 },
  scaleLabel: { color: COACH_DM_COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  scaleDesc: { color: COACH_DM_COLORS.textSecondary, fontSize: 11 },
});
