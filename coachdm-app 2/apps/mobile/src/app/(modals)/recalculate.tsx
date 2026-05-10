// ═══════════════════════════════════════════════════════════════
// COACH DM — Modal recalculer macros
// 
// Recalcule le nutrition_target avec le poids actuel.
// À utiliser après une perte/prise importante (>3 kg).
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button, Input } from '@/components/ui';
import { useProfile } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, radius } from '@/theme';
import {
  calculateAge,
  calculateNutritionTargets,
  type ActivityLevel,
  type NutritionGoal,
} from '@coachdm/shared';

export default function RecalculateModal() {
  const profile = useProfile();
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<NutritionGoal | null>(null);
  const [loading, setLoading] = useState(false);

  // Récupérer le target actif pour pré-remplir
  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .single()
      .then(({ data }) => {
        if (data) {
          setWeight(String(data.current_weight_kg));
          if (data.body_fat_percentage)
            setBodyFat(String(data.body_fat_percentage));
          setActivity(data.activity_level as ActivityLevel);
          setGoal(data.goal as NutritionGoal);
        }
      });
  }, [profile?.id]);

  async function handleRecalculate() {
    if (!profile?.id || !profile.date_of_birth || !profile.sex || !profile.height_cm) {
      Alert.alert('Erreur', 'Profil incomplet, complète d\'abord ton profil.');
      return;
    }
    const w = Number(weight);
    if (!w || w < 30 || w > 300) {
      Alert.alert('Poids invalide');
      return;
    }
    if (!activity || !goal) {
      Alert.alert('Sélectionne ton activité et ton objectif');
      return;
    }

    setLoading(true);
    try {
      const result = calculateNutritionTargets({
        weightKg: w,
        heightCm: profile.height_cm,
        ageYears: calculateAge(profile.date_of_birth),
        sex: profile.sex,
        activityLevel: activity,
        goal,
        bodyFatPercentage: bodyFat ? Number(bodyFat) : null,
      });

      // Désactiver l'ancien
      await supabase
        .from('nutrition_targets')
        .update({ is_active: false })
        .eq('user_id', profile.id)
        .eq('is_active', true);

      // Insérer le nouveau
      const { error } = await supabase.from('nutrition_targets').insert({
        user_id: profile.id,
        current_weight_kg: w,
        body_fat_percentage: bodyFat ? Number(bodyFat) : null,
        activity_level: activity,
        goal,
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
      if (error) throw error;

      Alert.alert(
        'Plan mis à jour',
        `Nouvelles cibles :\n${result.daily_calories} kcal · P ${result.macros.protein_g}g · G ${result.macros.carbs_g}g · L ${result.macros.fat_g}g`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const goals: Array<{ id: NutritionGoal; label: string }> = [
    { id: 'lose_fat', label: 'Sèche' },
    { id: 'maintain', label: 'Maintien' },
    { id: 'build_muscle', label: 'Muscle' },
    { id: 'recomp', label: 'Recomp' },
  ];

  const activities: Array<{ id: ActivityLevel; label: string }> = [
    { id: 'sedentary', label: 'Sédentaire' },
    { id: 'light', label: 'Légère' },
    { id: 'moderate', label: 'Modérée' },
    { id: 'active', label: 'Active' },
    { id: 'very_active', label: 'Très active' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Recalculer mon plan</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.tip}>
          Recalcule après une variation de poids importante (3+ kg) ou un changement d'objectif.
        </Text>

        <Input
          label="Poids actuel (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />

        <Input
          label="% masse grasse (optionnel)"
          value={bodyFat}
          onChangeText={setBodyFat}
          keyboardType="decimal-pad"
        />

        <Text style={styles.fieldLabel}>Activité</Text>
        <View style={styles.row}>
          {activities.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => setActivity(a.id)}
              style={[styles.chip, activity === a.id && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  activity === a.id && { color: colors.textOnPrimary },
                ]}
              >
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Objectif</Text>
        <View style={styles.row}>
          {goals.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => setGoal(g.id)}
              style={[styles.chip, goal === g.id && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  goal === g.id && { color: colors.textOnPrimary },
                ]}
              >
                {g.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button
          title="Recalculer"
          onPress={handleRecalculate}
          loading={loading}
          fullWidth
          size="lg"
          style={{ marginTop: spacing['6'] }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['5'],
    paddingVertical: spacing['4'],
  },
  title: {
    color: colors.text,
    fontSize: typography.lg,
    fontWeight: typography.weights.bold,
  },
  scroll: {
    paddingHorizontal: spacing['5'],
    paddingBottom: spacing['10'],
  },
  tip: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: 20,
    marginBottom: spacing['5'],
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontWeight: typography.weights.semibold,
    marginTop: spacing['3'],
    marginBottom: spacing['2'],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2'],
  },
  chip: {
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.weights.semibold,
  },
});
