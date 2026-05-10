// apps/mobile/app/coach/plans/[id].tsx
// ============================================================
// Coach DM · Mobile · Assigned plan detail (week-by-week view)
// Visible to both coach and client
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createCoachClient,
  type AssignedPlan,
  type AssignedPlanWorkout,
  type AssignedPlanMeal,
  coachI18n,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { Colors } from '@/lib/theme';

const DAY_LABELS = {
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  nl: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
};

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const supabase = useSupabase();
  const { user, profile } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();

  const coach = useMemo(() => createCoachClient(supabase), [supabase]);

  const [plan, setPlan] = useState<AssignedPlan | null>(null);
  const [workouts, setWorkouts] = useState<AssignedPlanWorkout[]>([]);
  const [meals, setMeals] = useState<AssignedPlanMeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(1);

  const isCoach =
    !!plan && (plan.coach_user_id === user?.id || profile?.role === 'super_admin');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const data = await coach.getPlanWithSchedule(id);
      setPlan(data.plan);
      setWorkouts(data.workouts);
      setMeals(data.meals);
      // Compute current week based on start_date
      const startMs = new Date(data.plan.start_date).getTime();
      const weekIdx = Math.max(
        1,
        Math.min(
          data.plan.duration_weeks,
          Math.floor((Date.now() - startMs) / (7 * 86400000)) + 1
        )
      );
      setSelectedWeek(weekIdx);
      setLoading(false);
    })();
  }, [id]);

  const updateStatus = async (status: AssignedPlan['status']) => {
    if (!plan) return;
    try {
      const updated = await coach.updatePlanStatus(plan.id, status);
      setPlan(updated);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading || !plan) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  const title =
    locale === 'fr' ? plan.title_fr : locale === 'en' ? plan.title_en : plan.title_nl;
  const description =
    locale === 'fr'
      ? plan.description_fr
      : locale === 'en'
        ? plan.description_en
        : plan.description_nl;

  const weekWorkouts = workouts.filter((w) => w.week_number === selectedWeek);
  const dayLabels = DAY_LABELS[locale];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.gold,
          headerTitle: '',
        }}
      />

      {/* Plan header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.gold} />
            <Text style={styles.metaText}>
              {plan.duration_weeks} {coachI18n.plans.duration_weeks[locale]}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="flag-outline" size={14} color={Colors.gold} />
            <Text style={styles.metaText}>{plan.goal}</Text>
          </View>
          <View style={[styles.statusBadge, statusStyle(plan.status)]}>
            <Text style={styles.statusText}>{plan.status}</Text>
          </View>
        </View>
        <Text style={styles.dateRange}>
          {new Date(plan.start_date).toLocaleDateString(locale)} →{' '}
          {new Date(plan.end_date).toLocaleDateString(locale)}
        </Text>
      </View>

      {/* Coach actions */}
      {isCoach && (
        <View style={styles.coachActions}>
          {plan.status === 'active' && (
            <Pressable
              onPress={() => updateStatus('paused')}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="pause" size={16} color={Colors.text} />
              <Text style={styles.actionText}>
                {coachI18n.coachDash.pause[locale]}
              </Text>
            </Pressable>
          )}
          {plan.status === 'paused' && (
            <Pressable
              onPress={() => updateStatus('active')}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="play" size={16} color={Colors.text} />
              <Text style={styles.actionText}>
                {coachI18n.coachDash.resume[locale]}
              </Text>
            </Pressable>
          )}
          {plan.status === 'active' && (
            <Pressable
              onPress={() => updateStatus('completed')}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="checkmark-done" size={16} color={Colors.text} />
              <Text style={styles.actionText}>
                {locale === 'fr' ? 'Terminer' : 'Complete'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Week selector */}
      <Text style={styles.sectionLabel}>
        {coachI18n.plans.week[locale]}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekRow}
      >
        {Array.from({ length: plan.duration_weeks }).map((_, i) => {
          const w = i + 1;
          const active = selectedWeek === w;
          return (
            <Pressable
              key={w}
              onPress={() => setSelectedWeek(w)}
              style={[styles.weekPill, active && styles.weekPillActive]}
            >
              <Text
                style={[
                  styles.weekPillText,
                  active && styles.weekPillTextActive,
                ]}
              >
                S{w}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Days of selected week */}
      <View style={styles.daysContainer}>
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const w = weekWorkouts.find((x) => x.day_of_week === day);
          return (
            <View
              key={day}
              style={[
                styles.dayCard,
                w?.is_rest_day && styles.dayCardRest,
                !w && styles.dayCardEmpty,
              ]}
            >
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{dayLabels[day - 1]}</Text>
                {w?.intensity_modifier !== 1 && w && (
                  <Text style={styles.intensityTag}>
                    ×{w.intensity_modifier}
                  </Text>
                )}
              </View>
              {w?.is_rest_day ? (
                <Text style={styles.restText}>
                  {locale === 'fr' ? '😴 Repos' : '😴 Rest'}
                </Text>
              ) : w ? (
                <>
                  <Text style={styles.workoutTitle} numberOfLines={2}>
                    {locale === 'fr'
                      ? w.custom_title_fr
                      : locale === 'en'
                        ? w.custom_title_en
                        : w.custom_title_nl}
                    {!w.custom_title_fr && (locale === 'fr' ? 'Séance' : 'Workout')}
                  </Text>
                  {w.is_optional && (
                    <Text style={styles.optionalTag}>
                      {locale === 'fr' ? 'Optionnel' : 'Optional'}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.emptyDay}>—</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Nutrition (if prescribed) */}
      {meals && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {locale === 'fr' ? '🍽 Nutrition' : '🍽 Nutrition'}
          </Text>
          <View style={styles.macroGrid}>
            {meals.target_calories && (
              <Macro label="kcal" value={meals.target_calories} />
            )}
            {meals.target_protein_g && (
              <Macro label="P (g)" value={meals.target_protein_g} />
            )}
            {meals.target_carbs_g && (
              <Macro label="C (g)" value={meals.target_carbs_g} />
            )}
            {meals.target_fat_g && (
              <Macro label="L (g)" value={meals.target_fat_g} />
            )}
          </View>
          <Text style={styles.strategy}>
            {meals.carb_strategy === 'cyclical'
              ? locale === 'fr'
                ? 'Cyclage glucidique'
                : 'Carb cycling'
              : meals.carb_strategy === 'high_carb_training_day'
                ? locale === 'fr'
                  ? 'Glucides élevés (jour entraînement)'
                  : 'High carb (training day)'
                : meals.carb_strategy === 'low_carb_rest_day'
                  ? locale === 'fr'
                    ? 'Faibles glucides (jour off)'
                    : 'Low carb (rest day)'
                  : locale === 'fr'
                    ? 'Macros stables'
                    : 'Flat macros'}
          </Text>
        </View>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.macroBox}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function statusStyle(status: string) {
  if (status === 'active') return { backgroundColor: 'rgba(16, 185, 129, 0.2)' };
  if (status === 'paused') return { backgroundColor: 'rgba(255, 193, 7, 0.2)' };
  if (status === 'completed') return { backgroundColor: 'rgba(212, 175, 55, 0.25)' };
  return { backgroundColor: Colors.surface };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  description: {
    color: Colors.textDim,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 12,
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaText: { color: Colors.text, fontSize: 12, fontWeight: '600' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateRange: { color: Colors.textDim, fontSize: 12, marginTop: 8 },
  coachActions: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: { color: Colors.text, fontSize: 12, fontWeight: '600' },
  sectionLabel: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekRow: { gap: 8, paddingBottom: 4 },
  weekPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  weekPillActive: { backgroundColor: Colors.gold },
  weekPillText: { color: Colors.textDim, fontSize: 13, fontWeight: '600' },
  weekPillTextActive: { color: Colors.background },
  daysContainer: { gap: 8, marginTop: 16 },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 10,
    gap: 14,
  },
  dayCardRest: { opacity: 0.6 },
  dayCardEmpty: { opacity: 0.4 },
  dayHeader: { width: 56 },
  dayLabel: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '700',
  },
  intensityTag: {
    color: Colors.textDim,
    fontSize: 10,
    marginTop: 2,
  },
  workoutTitle: { flex: 1, color: Colors.text, fontSize: 14 },
  restText: { flex: 1, color: Colors.textDim, fontSize: 14, fontStyle: 'italic' },
  emptyDay: { flex: 1, color: Colors.textDim, fontSize: 14 },
  optionalTag: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 6,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  cardTitle: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  macroGrid: { flexDirection: 'row', gap: 8 },
  macroBox: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  macroValue: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  macroLabel: { color: Colors.textDim, fontSize: 11, marginTop: 2 },
  strategy: {
    color: Colors.textDim,
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
});
