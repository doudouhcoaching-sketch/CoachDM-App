// ═══════════════════════════════════════════════════════════════
// COACH DM — Modal log-food
// 
// Une fois un aliment choisi (search ou scan) : on saisit la
// quantité et le repas, puis on insère un food_log.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { Button, Input } from '@/components/ui';
import { useAddFoodLog } from '@/hooks/useNutrition';
import { useLocale } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, radius } from '@/theme';
import {
  computeFoodMacros,
  localizeFoodName,
  type Food,
  type MealType,
} from '@coachdm/shared';

const MEAL_OPTIONS: Array<{ id: MealType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'breakfast', label: 'P-déj', icon: 'sunny-outline' },
  { id: 'lunch', label: 'Déj', icon: 'partly-sunny-outline' },
  { id: 'dinner', label: 'Dîner', icon: 'moon-outline' },
  { id: 'snack', label: 'Coll.', icon: 'cafe-outline' },
  { id: 'pre_workout', label: 'Pré', icon: 'flash-outline' },
  { id: 'post_workout', label: 'Post', icon: 'fitness-outline' },
];

function suggestedMeal(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 17) return 'snack';
  if (h < 22) return 'dinner';
  return 'snack';
}

export default function LogFoodModal() {
  const { foodId } = useLocalSearchParams<{ foodId: string }>();
  const locale = useLocale();
  const addLog = useAddFoodLog();

  const [food, setFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [mealType, setMealType] = useState<MealType>(suggestedMeal());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!foodId) return;
    supabase
      .from('foods')
      .select('*')
      .eq('id', foodId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          Alert.alert('Erreur', 'Aliment introuvable');
          router.back();
          return;
        }
        setFood(data as unknown as Food);
        // Pré-remplir avec la portion par défaut
        if (data.default_serving_g) {
          setQuantity(String(data.default_serving_g));
        }
        setLoading(false);
      });
  }, [foodId]);

  const macros = useMemo(() => {
    if (!food) return null;
    const q = Number(quantity) || 0;
    return computeFoodMacros(food, q);
  }, [food, quantity]);

  async function handleAdd() {
    if (!food || !macros) return;
    const q = Number(quantity);
    if (!q || q <= 0 || q > 5000) {
      Alert.alert('Quantité invalide');
      return;
    }
    try {
      await addLog.mutateAsync({
        food,
        meal_type: mealType,
        quantity_g: q,
        logged_date: format(new Date(), 'yyyy-MM-dd'),
      });
      router.back();
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    }
  }

  if (loading || !food) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Text style={{ color: colors.textSecondary }}>Chargement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Ajouter au journal</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.foodName}>{localizeFoodName(food, locale)}</Text>
        {food.brand && <Text style={styles.foodBrand}>{food.brand}</Text>}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quantité</Text>
          <Input
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            rightSlot={<Text style={{ color: colors.textTertiary }}>g</Text>}
          />
          <View style={styles.quickQty}>
            {[50, 100, 150, 200].map((g) => (
              <Pressable
                key={g}
                style={[
                  styles.qtyChip,
                  Number(quantity) === g && styles.qtyChipActive,
                ]}
                onPress={() => setQuantity(String(g))}
              >
                <Text
                  style={[
                    styles.qtyChipText,
                    Number(quantity) === g && { color: colors.textOnPrimary },
                  ]}
                >
                  {g}g
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Repas</Text>
          <View style={styles.mealsRow}>
            {MEAL_OPTIONS.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setMealType(m.id)}
                style={[
                  styles.mealChip,
                  mealType === m.id && styles.mealChipActive,
                ]}
              >
                <Ionicons
                  name={m.icon}
                  size={16}
                  color={mealType === m.id ? colors.textOnPrimary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.mealChipText,
                    mealType === m.id && { color: colors.textOnPrimary },
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {macros && (
          <View style={styles.macrosCard}>
            <Text style={styles.macrosTitle}>Total ajouté</Text>
            <View style={styles.macrosGrid}>
              <MacroPreview label="Calories" value={`${Math.round(macros.kcal)}`} unit="kcal" color={colors.primary} />
              <MacroPreview label="Protéines" value={`${macros.protein_g.toFixed(1)}`} unit="g" color={colors.protein} />
              <MacroPreview label="Glucides" value={`${macros.carbs_g.toFixed(1)}`} unit="g" color={colors.carbs} />
              <MacroPreview label="Lipides" value={`${macros.fat_g.toFixed(1)}`} unit="g" color={colors.fat} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={`Ajouter ${macros ? `· ${Math.round(macros.kcal)} kcal` : ''}`}
          onPress={handleAdd}
          loading={addLog.isPending}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

function MacroPreview({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={styles.macroBlock}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingBottom: spacing['8'],
  },
  foodName: {
    color: colors.text,
    fontSize: typography.xl2,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.3,
  },
  foodBrand: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: 4,
    marginBottom: spacing['4'],
  },
  section: {
    marginTop: spacing['5'],
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing['2'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickQty: {
    flexDirection: 'row',
    gap: spacing['2'],
    marginTop: -spacing['2'],
  },
  qtyChip: {
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  qtyChipText: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.weights.semibold,
  },
  mealsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2'],
  },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealChipText: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.weights.semibold,
  },
  macrosCard: {
    marginTop: spacing['6'],
    padding: spacing['5'],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  macrosTitle: {
    color: colors.textSecondary,
    fontSize: typography.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing['3'],
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroBlock: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: typography.xl2,
    fontWeight: typography.weights.black,
    letterSpacing: -1,
  },
  macroUnit: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    marginTop: -4,
  },
  macroLabel: {
    color: colors.textSecondary,
    fontSize: typography.xs,
    fontWeight: typography.weights.medium,
    marginTop: 4,
  },
  footer: {
    padding: spacing['5'],
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
});
