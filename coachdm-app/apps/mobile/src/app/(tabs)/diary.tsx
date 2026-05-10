// ═══════════════════════════════════════════════════════════════
// COACH DM — Diary (journal alimentaire)
// 
// Liste les food_logs du jour groupés par meal_type, avec totaux.
// Swipe to delete + ajout rapide par section.
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
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

import { Card } from '@/components/ui';
import { useFoodLogs, useDeleteFoodLog } from '@/hooks/useNutrition';
import { useLocale } from '@/lib/store';
import { localizeFoodName, type MealType } from '@coachdm/shared';
import { colors, typography, spacing, radius } from '@/theme';

const MEAL_ORDER: MealType[] = [
  'breakfast',
  'pre_workout',
  'lunch',
  'snack',
  'post_workout',
  'dinner',
];

const MEAL_LABELS: Record<MealType, { fr: string; icon: keyof typeof Ionicons.glyphMap }> = {
  breakfast: { fr: 'Petit-déjeuner', icon: 'sunny-outline' },
  lunch: { fr: 'Déjeuner', icon: 'partly-sunny-outline' },
  dinner: { fr: 'Dîner', icon: 'moon-outline' },
  snack: { fr: 'Collation', icon: 'cafe-outline' },
  pre_workout: { fr: 'Pré-entraînement', icon: 'flash-outline' },
  post_workout: { fr: 'Post-entraînement', icon: 'fitness-outline' },
};

export default function DiaryScreen() {
  const { data: logs = [], isLoading, refetch } = useFoodLogs();
  const deleteLog = useDeleteFoodLog();
  const locale = useLocale();
  const [date] = useState(new Date());

  const grouped = useMemo(() => {
    const map: Partial<Record<MealType, typeof logs>> = {};
    for (const log of logs) {
      if (!map[log.meal_type]) map[log.meal_type] = [];
      map[log.meal_type]!.push(log);
    }
    return map;
  }, [logs]);

  function handleDelete(id: string, name: string) {
    Alert.alert('Supprimer ?', `Retirer "${name}" du journal ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => deleteLog.mutate(id),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Journal</Text>
          <Text style={styles.subtitle}>
            {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(modals)/add-food')}
          style={styles.headerBtn}
        >
          <Ionicons name="add" size={24} color={colors.textOnPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {MEAL_ORDER.map((mealType) => {
          const items = grouped[mealType] ?? [];
          if (items.length === 0) return null;

          const total = items.reduce(
            (acc, log) => ({
              kcal: acc.kcal + Number(log.kcal),
              protein: acc.protein + Number(log.protein_g),
              carbs: acc.carbs + Number(log.carbs_g),
              fat: acc.fat + Number(log.fat_g),
            }),
            { kcal: 0, protein: 0, carbs: 0, fat: 0 },
          );

          return (
            <Card key={mealType} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={styles.mealHeaderLeft}>
                  <Ionicons
                    name={MEAL_LABELS[mealType].icon}
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.mealTitle}>
                    {MEAL_LABELS[mealType].fr}
                  </Text>
                </View>
                <Text style={styles.mealKcal}>{Math.round(total.kcal)} kcal</Text>
              </View>

              {items.map((log) => {
                const name = localizeFoodName(log.food, locale);
                return (
                  <Pressable
                    key={log.id}
                    onLongPress={() => handleDelete(log.id, name)}
                    style={styles.foodRow}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foodName} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={styles.foodMeta}>
                        {Math.round(log.quantity_g)} g · P {Math.round(log.protein_g)} · G{' '}
                        {Math.round(log.carbs_g)} · L {Math.round(log.fat_g)}
                      </Text>
                    </View>
                    <Text style={styles.foodKcal}>
                      {Math.round(Number(log.kcal))}
                    </Text>
                  </Pressable>
                );
              })}
            </Card>
          );
        })}

        {logs.length === 0 && !isLoading && (
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Aucun aliment enregistré</Text>
            <Pressable
              onPress={() => router.push('/(modals)/add-food')}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>Ajouter mon premier aliment</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.tip}>Maintien appuyé sur un aliment pour le supprimer.</Text>
        <View style={{ height: spacing['10'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['5'],
    paddingVertical: spacing['4'],
  },
  title: {
    color: colors.text,
    fontSize: typography.xl2,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  headerBtn: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['2'],
  },
  mealCard: { marginBottom: spacing['4'] },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['3'],
    paddingBottom: spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    flex: 1,
  },
  mealTitle: {
    color: colors.text,
    fontSize: typography.base,
    fontWeight: typography.weights.bold,
  },
  mealKcal: {
    color: colors.primary,
    fontSize: typography.sm,
    fontWeight: typography.weights.bold,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing['3'],
  },
  foodName: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.weights.semibold,
  },
  foodMeta: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    marginTop: 2,
  },
  foodKcal: {
    color: colors.text,
    fontSize: typography.base,
    fontWeight: typography.weights.bold,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['16'],
    gap: spacing['3'],
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.base,
  },
  emptyBtn: {
    marginTop: spacing['3'],
    paddingHorizontal: spacing['6'],
    paddingVertical: spacing['3'],
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  emptyBtnText: {
    color: colors.textOnPrimary,
    fontWeight: typography.weights.bold,
  },
  tip: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: typography.xs,
    marginTop: spacing['4'],
  },
});
