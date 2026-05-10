// ═══════════════════════════════════════════════════════════════
// COACH DM — Onboarding step 4 : Activity + finalisation
// 
// Dernière étape : on calcule TDEE/macros via le package shared,
// on insère le profil + nutrition_targets, puis redirection /tabs.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui';
import { useOnboardingStore } from '@/lib/onboardingStore';
import { useAuthStore } from '@/lib/store';
import { refreshProfile } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, radius } from '@/theme';
import {
  calculateNutritionTargets,
  type ActivityLevel,
} from '@coachdm/shared';

const levels: Array<{
  id: ActivityLevel;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'sedentary', title: 'Sédentaire', desc: 'Bureau, peu/pas d\'exercice', icon: 'desktop-outline' },
  { id: 'light', title: 'Légère', desc: '1-3 séances par semaine', icon: 'walk-outline' },
  { id: 'moderate', title: 'Modérée', desc: '3-5 séances par semaine', icon: 'fitness-outline' },
  { id: 'active', title: 'Active', desc: '6-7 séances par semaine', icon: 'barbell-outline' },
  { id: 'very_active', title: 'Très active', desc: 'Athlète, 2 séances/jour', icon: 'trophy-outline' },
];

export default function OnboardingActivity() {
  const onboarding = useOnboardingStore();
  const session = useAuthStore((s) => s.session);
  const [submitting, setSubmitting] = useState(false);

  async function handleFinish() {
    if (!onboarding.activity_level) return;
    if (!session?.user) {
      Alert.alert('Erreur', 'Session expirée. Reconnecte-toi.');
      return;
    }
    if (
      !onboarding.height_cm ||
      !onboarding.current_weight_kg ||
      !onboarding.sex ||
      !onboarding.date_of_birth ||
      !onboarding.goal
    ) {
      Alert.alert('Erreur', 'Données incomplètes.');
      return;
    }

    setSubmitting(true);
    try {
      const ageYears = Math.floor(
        (Date.now() - new Date(onboarding.date_of_birth).getTime()) /
          (365.25 * 24 * 3600 * 1000),
      );

      // Calcul nutrition science-based
      const result = calculateNutritionTargets({
        weightKg: onboarding.current_weight_kg,
        heightCm: onboarding.height_cm,
        ageYears,
        sex: onboarding.sex,
        activityLevel: onboarding.activity_level,
        goal: onboarding.goal,
        bodyFatPercentage: onboarding.body_fat_percentage ?? null,
      });

      // 1. Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: onboarding.full_name,
          date_of_birth: onboarding.date_of_birth,
          sex: onboarding.sex,
          height_cm: onboarding.height_cm,
          onboarding_completed: true,
        })
        .eq('id', session.user.id);
      if (profileError) throw profileError;

      // 2. Désactiver les anciens targets éventuels
      await supabase
        .from('nutrition_targets')
        .update({ is_active: false })
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      // 3. Créer le nouveau target
      const { error: targetError } = await supabase
        .from('nutrition_targets')
        .insert({
          user_id: session.user.id,
          current_weight_kg: onboarding.current_weight_kg,
          target_weight_kg: onboarding.target_weight_kg,
          body_fat_percentage: onboarding.body_fat_percentage,
          activity_level: onboarding.activity_level,
          goal: onboarding.goal,
          bmr_kcal: result.bmr,
          tdee_kcal: result.tdee,
          daily_calories_kcal: result.daily_calories,
          protein_g: result.macros.protein_g,
          carbs_g: result.macros.carbs_g,
          fat_g: result.macros.fat_g,
          fiber_g: result.macros.fiber_g,
          water_ml: result.water_ml,
          is_active: true,
          calculation_method: result.method,
        });
      if (targetError) throw targetError;

      // 4. Premier weight log
      await supabase.from('weight_logs').upsert(
        {
          user_id: session.user.id,
          weight_kg: onboarding.current_weight_kg,
          body_fat_percentage: onboarding.body_fat_percentage,
          logged_date: new Date().toISOString().slice(0, 10),
        },
        { onConflict: 'user_id,logged_date' },
      );

      // 5. Refresh + redirect
      await refreshProfile();
      onboarding.reset();
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        <Text style={styles.title}>Ton niveau d'activité</Text>
        <Text style={styles.subtitle}>
          Sois honnête : sous-estimer t'obligera à rajouter des calories plus tard.
        </Text>

        <View style={{ gap: spacing['3'] }}>
          {levels.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => onboarding.set('activity_level', l.id)}
              style={[
                styles.card,
                onboarding.activity_level === l.id && styles.cardActive,
              ]}
            >
              <View style={styles.iconCircle}>
                <Ionicons
                  name={l.icon}
                  size={22}
                  color={onboarding.activity_level === l.id ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{l.title}</Text>
                <Text style={styles.cardDesc}>{l.desc}</Text>
              </View>
              {onboarding.activity_level === l.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            title="Retour"
            onPress={() => router.back()}
            variant="ghost"
            style={{ flex: 1 }}
          />
          <Button
            title="Calculer mon plan"
            onPress={handleFinish}
            loading={submitting}
            disabled={!onboarding.activity_level}
            size="lg"
            style={{ flex: 2 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: spacing['6'], paddingBottom: spacing['10'] },
  progress: { flexDirection: 'row', gap: spacing['2'], marginBottom: spacing['8'] },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  title: {
    color: colors.text,
    fontSize: typography.xl3,
    fontWeight: typography.weights.bold,
    marginBottom: spacing['2'],
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.base,
    marginBottom: spacing['8'],
    lineHeight: 22,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing['4'],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing['4'],
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.base,
    fontWeight: typography.weights.semibold,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing['3'],
    marginTop: spacing['8'],
  },
});
