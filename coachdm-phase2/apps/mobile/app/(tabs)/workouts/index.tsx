// apps/mobile/app/(tabs)/workouts/index.tsx
// COACH DM — Tab Workouts : landing avec programme actif + catalogue

import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listPrograms,
  getTodaysWorkout,
  type Program,
  type WorkoutGoal,
  programTitle,
  workoutTitle,
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
  green: '#10B981',
  red: '#EF4444',
  blue: '#38BDF8',
  violet: '#A78BFA',
};

const GOAL_LABELS: Record<WorkoutGoal, { fr: string; en: string; nl: string; emoji: string }> = {
  fat_loss: { fr: 'Perte de poids', en: 'Fat loss', nl: 'Vetverlies', emoji: '🔥' },
  strength: { fr: 'Force', en: 'Strength', nl: 'Kracht', emoji: '💪' },
  functional: { fr: 'Fonctionnel', en: 'Functional', nl: 'Functioneel', emoji: '⚡' },
  sport: { fr: 'Sport', en: 'Sport', nl: 'Sport', emoji: '🏃' },
  travel_home: { fr: 'Voyage', en: 'Travel', nl: 'Reizen', emoji: '✈️' },
  mobility: { fr: 'Mobilité', en: 'Mobility', nl: 'Mobiliteit', emoji: '🧘' },
  custom: { fr: 'Sur mesure', en: 'Custom', nl: 'Op maat', emoji: '⭐' },
};

export default function WorkoutsTab() {
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<WorkoutGoal | 'all'>('all');

  const today = useQuery({
    queryKey: ['todays-workout', user?.id],
    queryFn: () => (user ? getTodaysWorkout(supabase, user.id) : null),
    enabled: !!user,
  });

  const programs = useQuery({
    queryKey: ['programs'],
    queryFn: () => listPrograms(supabase),
  });

  const filteredPrograms = useMemo(() => {
    const list = programs.data ?? [];
    return activeFilter === 'all' ? list : list.filter((p) => p.goal === activeFilter);
  }, [programs.data, activeFilter]);

  const onRefresh = () => {
    qc.invalidateQueries({ queryKey: ['todays-workout'] });
    qc.invalidateQueries({ queryKey: ['programs'] });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={today.isRefetching || programs.isRefetching}
          onRefresh={onRefresh}
          tintColor={COLORS.gold}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.titleSm}>COACH DM</Text>
        <Text style={styles.title}>{t('workouts.title', 'Entraînement')}</Text>
      </View>

      {/* Today's session card */}
      {today.isLoading ? (
        <ActivityIndicator color={COLORS.gold} style={{ marginVertical: 24 }} />
      ) : today.data ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(tabs)/workouts/session',
              params: { workoutId: today.data!.workout.id, enrollmentId: today.data!.enrollment.id },
            })
          }
          style={({ pressed }) => [styles.todayCard, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.todayLabel}>{t('workouts.todaySession', 'Séance du jour')}</Text>
          <Text style={styles.todayProgram}>
            {programTitle(today.data.program, locale)} —{' '}
            {t('workouts.weekDay', 'S{{week}} J{{day}}')
              .replace('{{week}}', String(today.data.enrollment.current_week))
              .replace('{{day}}', String(today.data.enrollment.current_day))}
          </Text>
          <Text style={styles.todayTitle}>{workoutTitle(today.data.workout, locale)}</Text>
          {today.data.workout.focus && (
            <Text style={styles.todayFocus}>{today.data.workout.focus}</Text>
          )}
          <View style={styles.todayMeta}>
            <Text style={styles.todayMetaText}>
              ⏱ {today.data.workout.estimated_duration_min} min
            </Text>
            <Text style={styles.todayMetaText}>
              {today.data.workout.exercises.length} {t('workouts.exercises', 'exercices')}
            </Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{t('workouts.start', 'Commencer')} →</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.emptyToday}>
          <Text style={styles.emptyTitle}>{t('workouts.noActiveProgram', 'Aucun programme actif')}</Text>
          <Text style={styles.emptySubtitle}>
            {t(
              'workouts.chooseBelow',
              'Choisis un programme ci-dessous pour commencer ton parcours premium.'
            )}
          </Text>
        </View>
      )}

      {/* Goal filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <FilterChip
          active={activeFilter === 'all'}
          label={t('workouts.all', 'Tous')}
          emoji=""
          onPress={() => setActiveFilter('all')}
        />
        {(Object.keys(GOAL_LABELS) as WorkoutGoal[])
          .filter((g) => g !== 'custom')
          .map((g) => (
            <FilterChip
              key={g}
              active={activeFilter === g}
              label={GOAL_LABELS[g][locale]}
              emoji={GOAL_LABELS[g].emoji}
              onPress={() => setActiveFilter(g)}
            />
          ))}
      </ScrollView>

      {/* Programs grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('workouts.programs', 'Programmes')} · {filteredPrograms.length}
        </Text>
        {programs.isLoading ? (
          <ActivityIndicator color={COLORS.gold} />
        ) : (
          filteredPrograms.map((p) => <ProgramCard key={p.id} program={p} locale={locale} />)
        )}
      </View>
    </ScrollView>
  );
}

function FilterChip({
  active,
  label,
  emoji,
  onPress,
}: {
  active: boolean;
  label: string;
  emoji: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

function ProgramCard({ program, locale }: { program: Program; locale: 'fr' | 'en' | 'nl' }) {
  const goal = GOAL_LABELS[program.goal];
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(tabs)/workouts/program', params: { id: program.id } })}
      style={({ pressed }) => [styles.programCard, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.programHeader}>
        <Text style={styles.programGoal}>
          {goal.emoji} {goal[locale].toUpperCase()}
        </Text>
        {program.is_recommended && <Text style={styles.recommended}>⭐ {locale === 'fr' ? 'Recommandé' : 'Recommended'}</Text>}
      </View>
      <Text style={styles.programTitle}>{programTitle(program, locale)}</Text>
      <Text style={styles.programDesc} numberOfLines={2}>
        {locale === 'fr'
          ? program.description_fr
          : locale === 'en'
            ? program.description_en
            : program.description_nl}
      </Text>
      <View style={styles.programMeta}>
        <Text style={styles.programMetaText}>{program.duration_weeks} sem.</Text>
        <Text style={styles.programMetaDot}>·</Text>
        <Text style={styles.programMetaText}>
          {program.sessions_per_week}× / {locale === 'fr' ? 'sem' : locale === 'en' ? 'wk' : 'wk'}
        </Text>
        <Text style={styles.programMetaDot}>·</Text>
        <Text style={styles.programMetaText}>{program.difficulty}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  titleSm: { color: COLORS.gold, fontSize: 11, letterSpacing: 3, fontWeight: '700' },
  title: { color: COLORS.text, fontSize: 32, fontWeight: '900', marginTop: 6 },

  todayCard: {
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  todayLabel: { color: COLORS.gold, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  todayProgram: { color: COLORS.textMuted, fontSize: 13, marginTop: 8 },
  todayTitle: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  todayFocus: { color: COLORS.textMuted, fontSize: 14, marginTop: 4, fontStyle: 'italic' },
  todayMeta: { flexDirection: 'row', gap: 16, marginTop: 12 },
  todayMetaText: { color: COLORS.textMuted, fontSize: 13 },
  cta: {
    marginTop: 16,
    backgroundColor: COLORS.gold,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaText: { color: COLORS.bg, fontWeight: '800', fontSize: 15 },

  emptyToday: {
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 6, lineHeight: 20 },

  filters: { paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: COLORS.bg, fontWeight: '800' },

  section: { paddingHorizontal: 20 },
  sectionTitle: {
    color: COLORS.gold,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  programCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  programHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  programGoal: { color: COLORS.gold, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  recommended: { color: COLORS.gold, fontSize: 10, fontWeight: '700' },
  programTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  programDesc: { color: COLORS.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  programMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  programMetaText: { color: COLORS.textMuted, fontSize: 12 },
  programMetaDot: { color: COLORS.border, fontSize: 12 },
});
