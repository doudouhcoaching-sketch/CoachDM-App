// apps/mobile/app/(tabs)/workouts/session.tsx
// COACH DM — Lecteur de séance avec logger en direct, tips science-based, code couleur PDFs

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWorkoutFull,
  startSession,
  logSet,
  endSession,
  exerciseName,
  exerciseCues,
  exerciseTip,
  workoutTitle,
  workoutExerciseNotes,
  type WorkoutExerciseFull,
  type WorkoutFull,
  type WorkoutSession,
  type SetLog,
  type TipColor,
} from '@coachdm/shared/workouts';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

const COLORS = {
  bg: '#0A0A0A',
  surface: '#141414',
  surfaceLight: '#1F1F1F',
  gold: '#D4AF37',
  text: '#F5F5F5',
  textMuted: '#888',
  border: '#262626',
  green: '#10B981',
  red: '#EF4444',
  blue: '#38BDF8',
  violet: '#A78BFA',
};

const TIP_STYLES: Record<TipColor, { color: string; icon: string }> = {
  green: { color: COLORS.green, icon: '✓' },
  red: { color: COLORS.red, icon: '✗' },
  blue: { color: COLORS.blue, icon: 'ⓘ' },
  violet: { color: COLORS.violet, icon: '⚑' },
};

const BLOCK_LABELS: Record<string, { fr: string; en: string; nl: string }> = {
  warmup: { fr: 'Échauffement', en: 'Warm-up', nl: 'Opwarming' },
  main: { fr: 'Principal', en: 'Main', nl: 'Hoofd' },
  accessory: { fr: 'Accessoire', en: 'Accessory', nl: 'Accessoire' },
  metcon: { fr: 'MetCon', en: 'MetCon', nl: 'MetCon' },
  cooldown: { fr: 'Retour au calme', en: 'Cool-down', nl: 'Cool-down' },
};

interface PendingSet {
  reps: string;
  weight: string;
  rpe: string;
}

export default function SessionScreen() {
  const { workoutId, enrollmentId, preview } = useLocalSearchParams<{
    workoutId: string;
    enrollmentId?: string;
    preview?: string;
  }>();
  const isPreview = preview === '1';
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const qc = useQueryClient();

  const workout = useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => getWorkoutFull(supabase, workoutId!),
    enabled: !!workoutId,
  });

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [pendingSets, setPendingSets] = useState<Record<string, PendingSet>>({});
  const [completedSets, setCompletedSets] = useState<SetLog[]>([]);
  const [restTimer, setRestTimer] = useState<{ exerciseId: string; secondsLeft: number } | null>(
    null
  );
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-start session on mount (unless preview)
  const startMut = useMutation({
    mutationFn: () => startSession(supabase, user!.id, workoutId!, enrollmentId ?? null),
    onSuccess: (s) => setSession(s),
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Erreur';
      Alert.alert(t('common.error', 'Erreur'), msg);
    },
  });

  useEffect(() => {
    if (!isPreview && user && workoutId && !session && !startMut.isPending) {
      startMut.mutate();
    }
  }, [isPreview, user, workoutId, session]);

  const logSetMut = useMutation({
    mutationFn: async (params: {
      we: WorkoutExerciseFull;
      setNumber: number;
      reps: number | null;
      weight: number | null;
      rpe: number | null;
    }) => {
      if (!session) throw new Error('Session not started');
      return logSet(supabase, session.id, {
        workout_exercise_id: params.we.id,
        exercise_id: params.we.exercise_id,
        set_number: params.setNumber,
        set_type: params.we.set_type,
        reps: params.reps,
        weight_kg: params.weight,
        duration_sec: null,
        distance_m: null,
        rpe: params.rpe,
        rir: null,
        rest_sec: params.we.prescribed_rest_sec,
        notes: null,
      });
    },
    onSuccess: (newLog, vars) => {
      setCompletedSets((s) => [...s, newLog]);
      // Reset that pending set for next entry
      const key = pendingKey(vars.we.id, vars.setNumber + 1);
      setPendingSets((p) => ({
        ...p,
        [key]: { reps: vars.reps ? String(vars.reps) : '', weight: vars.weight ? String(vars.weight) : '', rpe: '' },
      }));
      // Start rest timer
      if (vars.we.prescribed_rest_sec > 0) {
        startRestTimer(vars.we.exercise_id, vars.we.prescribed_rest_sec);
      }
      if (newLog.is_pr) {
        Alert.alert(
          '🏆 ' + t('workouts.newPR', 'Nouveau record !'),
          t(
            'workouts.newPRMsg',
            'Tu viens de battre ton record sur cet exercice. Continue comme ça.'
          )
        );
      }
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Erreur';
      Alert.alert(t('common.error', 'Erreur'), msg);
    },
  });

  const endMut = useMutation({
    mutationFn: (rpe: number) => endSession(supabase, session!.id, rpe),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todays-workout'] });
      qc.invalidateQueries({ queryKey: ['recent-sessions'] });
      router.replace('/(tabs)/workouts');
    },
  });

  const startRestTimer = (exerciseId: string, sec: number) => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestTimer({ exerciseId, secondsLeft: sec });
    restIntervalRef.current = setInterval(() => {
      setRestTimer((cur) => {
        if (!cur) return null;
        if (cur.secondsLeft <= 1) {
          if (restIntervalRef.current) clearInterval(restIntervalRef.current);
          return null;
        }
        return { ...cur, secondsLeft: cur.secondsLeft - 1 };
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, []);

  const pendingKey = (weId: string, setNumber: number) => `${weId}-${setNumber}`;

  const setsForExercise = (weId: string) =>
    completedSets.filter((s) => s.workout_exercise_id === weId).sort((a, b) => a.set_number - b.set_number);

  const handleLog = (we: WorkoutExerciseFull) => {
    const done = setsForExercise(we.id).length;
    const setNumber = done + 1;
    const key = pendingKey(we.id, setNumber);
    const pending = pendingSets[key] ?? { reps: '', weight: '', rpe: '' };
    const reps = pending.reps ? parseInt(pending.reps, 10) : null;
    const weight = pending.weight ? parseFloat(pending.weight.replace(',', '.')) : null;
    const rpe = pending.rpe ? parseFloat(pending.rpe.replace(',', '.')) : null;

    if (reps == null && weight == null && we.set_type !== 'time') {
      Alert.alert(
        t('workouts.empty', 'Vide'),
        t('workouts.fillReps', 'Renseigne au moins les reps ou la durée.')
      );
      return;
    }
    logSetMut.mutate({ we, setNumber, reps, weight, rpe });
  };

  const handleFinish = () => {
    Alert.alert(
      t('workouts.finishTitle', 'Terminer la séance ?'),
      t('workouts.finishPrompt', 'Évalue ta difficulté ressentie (RPE)'),
      [
        { text: '6', onPress: () => endMut.mutate(6) },
        { text: '7', onPress: () => endMut.mutate(7) },
        { text: '8', onPress: () => endMut.mutate(8) },
        { text: '9', onPress: () => endMut.mutate(9) },
        { text: t('common.cancel', 'Annuler'), style: 'cancel' },
      ]
    );
  };

  const groupedExercises = useMemo(() => {
    if (!workout.data) return {};
    const by: Record<string, WorkoutExerciseFull[]> = {};
    workout.data.exercises.forEach((we) => {
      (by[we.block] ??= []).push(we);
    });
    return by;
  }, [workout.data]);

  if (workout.isLoading || !workout.data) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  const w = workout.data;
  const blockOrder: Array<keyof typeof BLOCK_LABELS> = ['warmup', 'main', 'accessory', 'metcon', 'cooldown'];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← {t('common.back', 'Retour')}</Text>
          </Pressable>
          {!isPreview && session && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t('workouts.live', 'EN COURS')}</Text>
            </View>
          )}
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.workoutTitle}>{workoutTitle(w, locale)}</Text>
          {w.focus && <Text style={styles.workoutFocus}>{w.focus}</Text>}
          <Text style={styles.workoutMeta}>
            ⏱ {w.estimated_duration_min} min · {w.exercises.length}{' '}
            {t('workouts.exercises', 'exercices')}
          </Text>
          {w.intro_fr && (
            <View style={styles.introBox}>
              <Text style={styles.introText}>
                {locale === 'fr' ? w.intro_fr : locale === 'en' ? w.intro_en : w.intro_nl}
              </Text>
            </View>
          )}
        </View>

        {blockOrder.map((block) => {
          const list = groupedExercises[block];
          if (!list || list.length === 0) return null;
          const label = BLOCK_LABELS[block][locale];
          return (
            <View key={block} style={styles.blockSection}>
              <Text style={styles.blockTitle}>{label.toUpperCase()}</Text>
              {list.map((we) => {
                const isActive = activeExerciseId === we.id;
                const completed = setsForExercise(we.id);
                const allDone = completed.length >= we.prescribed_sets;
                const tip = exerciseTip(we.exercise, locale);
                const tipStyle = TIP_STYLES[we.exercise.tip_color];

                return (
                  <Pressable
                    key={we.id}
                    onPress={() => setActiveExerciseId(isActive ? null : we.id)}
                    style={[
                      styles.exerciseCard,
                      isActive && styles.exerciseCardActive,
                      allDone && styles.exerciseCardDone,
                    ]}
                  >
                    {/* Header */}
                    <View style={styles.exerciseHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exerciseName}>
                          {allDone ? '✓ ' : ''}
                          {exerciseName(we.exercise, locale)}
                        </Text>
                        <Text style={styles.exercisePrescription}>
                          {we.prescribed_sets} ×{' '}
                          {we.prescribed_reps ?? we.prescribed_sets}
                          {we.prescribed_rest_sec > 0 ? ` · ${we.prescribed_rest_sec}s ${t('workouts.rest', 'repos')}` : ''}
                          {we.prescribed_rpe ? ` · RPE ${we.prescribed_rpe}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.exerciseModalityBadge}>{we.exercise.modality}</Text>
                    </View>

                    {/* Notes prescrites */}
                    {workoutExerciseNotes(we, locale) && (
                      <Text style={styles.exerciseNote}>
                        {workoutExerciseNotes(we, locale)}
                      </Text>
                    )}

                    {isActive && (
                      <View>
                        {/* Cues */}
                        <View style={styles.cuesBox}>
                          <Text style={styles.cuesLabel}>
                            {t('workouts.technique', 'Technique')}
                          </Text>
                          <Text style={styles.cuesText}>{exerciseCues(we.exercise, locale)}</Text>
                        </View>

                        {/* Tip codé couleur */}
                        {tip && (
                          <View
                            style={[
                              styles.tipBox,
                              { borderLeftColor: tipStyle.color, backgroundColor: tipStyle.color + '15' },
                            ]}
                          >
                            <Text style={[styles.tipIcon, { color: tipStyle.color }]}>
                              {tipStyle.icon}
                            </Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.tipText}>{tip}</Text>
                              {we.exercise.reference_citation && (
                                <Text style={styles.tipRef}>{we.exercise.reference_citation}</Text>
                              )}
                            </View>
                          </View>
                        )}

                        {/* Vidéo */}
                        {we.exercise.video_url && (
                          <Pressable
                            onPress={() => Linking.openURL(we.exercise.video_url!)}
                            style={styles.videoBtn}
                          >
                            <Text style={styles.videoBtnText}>
                              ▶ {t('workouts.watchVideo', 'Voir la vidéo Coach DM')}
                            </Text>
                          </Pressable>
                        )}

                        {/* Sets déjà faites */}
                        {completed.length > 0 && (
                          <View style={styles.setsDone}>
                            <Text style={styles.setsLabel}>
                              {t('workouts.setsDone', 'Séries effectuées')}
                            </Text>
                            {completed.map((s) => (
                              <View key={s.id} style={styles.setRow}>
                                <Text style={styles.setNum}>#{s.set_number}</Text>
                                <Text style={styles.setVal}>
                                  {s.reps ?? '-'} reps
                                  {s.weight_kg ? ` × ${s.weight_kg} kg` : ''}
                                  {s.rpe ? ` · RPE ${s.rpe}` : ''}
                                  {s.is_pr ? ' 🏆' : ''}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Logger la prochaine série */}
                        {!isPreview && session && !allDone && (
                          <SetLogger
                            we={we}
                            setNumber={completed.length + 1}
                            pending={pendingSets[pendingKey(we.id, completed.length + 1)] ?? { reps: '', weight: '', rpe: '' }}
                            onChange={(p) =>
                              setPendingSets((s) => ({
                                ...s,
                                [pendingKey(we.id, completed.length + 1)]: p,
                              }))
                            }
                            onLog={() => handleLog(we)}
                            isLogging={logSetMut.isPending}
                            t={t}
                          />
                        )}

                        {/* Rest timer */}
                        {restTimer && restTimer.exerciseId === we.exercise_id && (
                          <View style={styles.restBox}>
                            <Text style={styles.restLabel}>{t('workouts.restTimer', 'Repos')}</Text>
                            <Text style={styles.restCountdown}>{restTimer.secondsLeft}s</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {!isPreview && session && (
        <View style={styles.bottomBar}>
          <Pressable
            onPress={handleFinish}
            disabled={endMut.isPending}
            style={({ pressed }) => [
              styles.finishBtn,
              pressed && { opacity: 0.85 },
              endMut.isPending && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.finishBtnText}>
              {endMut.isPending ? '...' : t('workouts.finish', 'Terminer la séance')}
            </Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function SetLogger({
  we,
  setNumber,
  pending,
  onChange,
  onLog,
  isLogging,
  t,
}: {
  we: WorkoutExerciseFull;
  setNumber: number;
  pending: PendingSet;
  onChange: (p: PendingSet) => void;
  onLog: () => void;
  isLogging: boolean;
  t: (k: string, def: string) => string;
}) {
  const isTime = we.set_type === 'time' || we.exercise.modality === 'run';
  const isWeighted = ['barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'sandbag', 'medball'].includes(
    we.exercise.modality
  );

  return (
    <View style={styles.loggerBox}>
      <Text style={styles.loggerLabel}>
        {t('workouts.set', 'Série')} #{setNumber}
      </Text>
      <View style={styles.loggerRow}>
        <View style={styles.loggerInputBlock}>
          <Text style={styles.loggerInputLabel}>
            {isTime ? t('workouts.duration', 'Durée (s)') : t('workouts.reps', 'Reps')}
          </Text>
          <TextInput
            value={pending.reps}
            onChangeText={(v) => onChange({ ...pending, reps: v })}
            keyboardType="numeric"
            style={styles.loggerInput}
            placeholder="0"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
        {isWeighted && (
          <View style={styles.loggerInputBlock}>
            <Text style={styles.loggerInputLabel}>{t('workouts.weight', 'kg')}</Text>
            <TextInput
              value={pending.weight}
              onChangeText={(v) => onChange({ ...pending, weight: v })}
              keyboardType="decimal-pad"
              style={styles.loggerInput}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        )}
        <View style={styles.loggerInputBlock}>
          <Text style={styles.loggerInputLabel}>RPE</Text>
          <TextInput
            value={pending.rpe}
            onChangeText={(v) => onChange({ ...pending, rpe: v })}
            keyboardType="decimal-pad"
            style={styles.loggerInput}
            placeholder="-"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>
      <Pressable
        onPress={onLog}
        disabled={isLogging}
        style={({ pressed }) => [
          styles.loggerBtn,
          pressed && { opacity: 0.85 },
          isLogging && { opacity: 0.5 },
        ]}
      >
        <Text style={styles.loggerBtnText}>
          {isLogging ? '...' : `✓ ${t('workouts.logSet', 'Valider la série')}`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56 },
  back: { color: COLORS.gold, fontSize: 14, fontWeight: '600' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.red + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.red },
  liveText: { color: COLORS.red, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' },

  titleBlock: { paddingHorizontal: 20, paddingTop: 20 },
  workoutTitle: { color: COLORS.text, fontSize: 26, fontWeight: '900' },
  workoutFocus: { color: COLORS.textMuted, fontSize: 14, marginTop: 4, fontStyle: 'italic' },
  workoutMeta: { color: COLORS.textMuted, fontSize: 13, marginTop: 8 },
  introBox: { backgroundColor: COLORS.surface, borderLeftWidth: 3, borderLeftColor: COLORS.gold, borderRadius: 8, padding: 12, marginTop: 14 },
  introText: { color: COLORS.text, fontSize: 13, lineHeight: 19 },

  blockSection: { paddingHorizontal: 20, marginTop: 24 },
  blockTitle: { color: COLORS.gold, fontSize: 11, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },

  exerciseCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  exerciseCardActive: { borderColor: COLORS.gold },
  exerciseCardDone: { opacity: 0.6 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  exerciseName: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  exercisePrescription: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  exerciseModalityBadge: { color: COLORS.gold, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  exerciseNote: { color: COLORS.text, fontSize: 13, marginTop: 8, fontStyle: 'italic' },

  cuesBox: { marginTop: 14, padding: 12, backgroundColor: COLORS.surfaceLight, borderRadius: 8 },
  cuesLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 },
  cuesText: { color: COLORS.text, fontSize: 13, lineHeight: 19 },

  tipBox: { flexDirection: 'row', gap: 10, padding: 12, borderLeftWidth: 3, borderRadius: 6, marginTop: 10 },
  tipIcon: { fontSize: 16, fontWeight: '800', marginTop: -1 },
  tipText: { color: COLORS.text, fontSize: 13, lineHeight: 19 },
  tipRef: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, fontStyle: 'italic' },

  videoBtn: { marginTop: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: COLORS.surfaceLight, borderRadius: 8 },
  videoBtnText: { color: COLORS.gold, fontSize: 13, fontWeight: '700' },

  setsDone: { marginTop: 14 },
  setsLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 },
  setRow: { flexDirection: 'row', gap: 12, paddingVertical: 6 },
  setNum: { color: COLORS.gold, fontWeight: '800', fontSize: 13, width: 28 },
  setVal: { color: COLORS.text, fontSize: 13 },

  loggerBox: { marginTop: 14, padding: 14, backgroundColor: COLORS.bg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.gold + '55' },
  loggerLabel: { color: COLORS.gold, fontSize: 11, letterSpacing: 1.5, fontWeight: '700', marginBottom: 10 },
  loggerRow: { flexDirection: 'row', gap: 8 },
  loggerInputBlock: { flex: 1 },
  loggerInputLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 1, fontWeight: '700', marginBottom: 4 },
  loggerInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  loggerBtn: { marginTop: 12, backgroundColor: COLORS.gold, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  loggerBtnText: { color: COLORS.bg, fontWeight: '900', fontSize: 14 },

  restBox: { marginTop: 12, alignItems: 'center', backgroundColor: COLORS.green + '15', borderRadius: 8, paddingVertical: 12 },
  restLabel: { color: COLORS.green, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  restCountdown: { color: COLORS.green, fontSize: 28, fontWeight: '900', marginTop: 4 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  finishBtn: { backgroundColor: COLORS.gold, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  finishBtnText: { color: COLORS.bg, fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
});
