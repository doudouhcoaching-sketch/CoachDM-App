// apps/mobile/app/(tabs)/workouts/program.tsx
// COACH DM — Détail d'un programme : description, planning, inscription

import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProgramWorkouts,
  enrollInProgram,
  programTitle,
  workoutTitle,
  type Program,
  type Workout,
} from '@coachdm/shared/workouts';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

const COLORS = {
  bg: '#0A0A0A',
  surface: '#141414',
  gold: '#D4AF37',
  text: '#F5F5F5',
  textMuted: '#888',
  border: '#1F1F1F',
};

export default function ProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const qc = useQueryClient();

  const program = useQuery({
    queryKey: ['program', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Program;
    },
    enabled: !!id,
  });

  const workouts = useQuery({
    queryKey: ['program-workouts', id],
    queryFn: () => getProgramWorkouts(supabase, id!),
    enabled: !!id,
  });

  const enroll = useMutation({
    mutationFn: () => enrollInProgram(supabase, user!.id, id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todays-workout'] });
      Alert.alert(
        t('workouts.enrolled', 'Inscrit !'),
        t('workouts.enrolledMsg', 'Ton programme est actif. Direction la séance du jour.'),
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/workouts') }]
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur';
      Alert.alert(t('common.error', 'Erreur'), msg);
    },
  });

  const grouped = useMemo(() => {
    const by: Record<number, Workout[]> = {};
    (workouts.data ?? []).forEach((w) => {
      if (w.week_number == null) return;
      (by[w.week_number] ??= []).push(w);
    });
    return by;
  }, [workouts.data]);

  if (program.isLoading || !program.data) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  const p = program.data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← {t('common.back', 'Retour')}</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>COACH DM</Text>
        <Text style={styles.heroTitle}>{programTitle(p, locale)}</Text>
        <Text style={styles.heroDesc}>
          {locale === 'fr' ? p.description_fr : locale === 'en' ? p.description_en : p.description_nl}
        </Text>
        <View style={styles.heroStats}>
          <Stat value={String(p.duration_weeks)} label={t('workouts.weeks', 'sem.')} />
          <Stat value={`${p.sessions_per_week}×`} label={t('workouts.perWeek', '/ sem.')} />
          <Stat value={p.difficulty} label={t('workouts.level', 'niveau')} />
        </View>
      </View>

      <Pressable
        onPress={() => enroll.mutate()}
        disabled={enroll.isPending}
        style={({ pressed }) => [
          styles.enrollBtn,
          pressed && { opacity: 0.85 },
          enroll.isPending && { opacity: 0.5 },
        ]}
      >
        <Text style={styles.enrollBtnText}>
          {enroll.isPending ? '...' : t('workouts.enroll', "S'inscrire à ce programme")}
        </Text>
      </Pressable>

      <View style={styles.planning}>
        <Text style={styles.sectionTitle}>{t('workouts.planning', 'Planning')}</Text>
        {workouts.isLoading ? (
          <ActivityIndicator color={COLORS.gold} />
        ) : Object.keys(grouped).length === 0 ? (
          <Text style={styles.empty}>
            {t(
              'workouts.contentInProgress',
              "Ce programme est en cours de préparation. Inscris-toi pour être notifié."
            )}
          </Text>
        ) : (
          Object.keys(grouped)
            .map((k) => parseInt(k, 10))
            .sort((a, b) => a - b)
            .map((week) => (
              <View key={week} style={styles.weekBlock}>
                <Text style={styles.weekLabel}>
                  {t('workouts.week', 'Semaine')} {week}
                </Text>
                {grouped[week]
                  .sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0))
                  .map((w) => (
                    <Pressable
                      key={w.id}
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/workouts/session',
                          params: { workoutId: w.id, preview: '1' },
                        })
                      }
                      style={({ pressed }) => [styles.dayCard, pressed && { opacity: 0.85 }]}
                    >
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>J{w.day_number}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dayTitle}>{workoutTitle(w, locale)}</Text>
                        {w.focus && <Text style={styles.dayFocus}>{w.focus}</Text>}
                        <Text style={styles.dayMeta}>⏱ {w.estimated_duration_min} min</Text>
                      </View>
                    </Pressable>
                  ))}
              </View>
            ))
        )}
      </View>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 56 },
  back: { color: COLORS.gold, fontSize: 14, fontWeight: '600' },

  hero: { paddingHorizontal: 20, paddingTop: 24 },
  heroLabel: { color: COLORS.gold, fontSize: 11, letterSpacing: 3, fontWeight: '700' },
  heroTitle: { color: COLORS.text, fontSize: 30, fontWeight: '900', marginTop: 6, lineHeight: 36 },
  heroDesc: { color: COLORS.textMuted, fontSize: 15, marginTop: 12, lineHeight: 22 },
  heroStats: { flexDirection: 'row', gap: 16, marginTop: 20 },
  statBlock: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statValue: { color: COLORS.gold, fontSize: 22, fontWeight: '900' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

  enrollBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  enrollBtnText: { color: COLORS.bg, fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },

  planning: { paddingHorizontal: 20, paddingTop: 32 },
  sectionTitle: {
    color: COLORS.gold,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  weekBlock: { marginBottom: 20 },
  weekLabel: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  dayBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBadgeText: { color: COLORS.gold, fontWeight: '900', fontSize: 14 },
  dayTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  dayFocus: { color: COLORS.textMuted, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  dayMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },

  empty: { color: COLORS.textMuted, fontSize: 14, lineHeight: 22, marginTop: 12 },
});
