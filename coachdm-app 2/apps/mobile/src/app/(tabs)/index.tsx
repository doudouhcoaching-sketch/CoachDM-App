// ═══════════════════════════════════════════════════════════════
// COACH DM — Today / Dashboard
// 
// L'écran le plus important : ce que le user voit en ouvrant l'app.
// Anneau calories animé, macros, actions rapides, hydratation.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { CalorieRing } from '@/components/CalorieRing';
import { MacroBar } from '@/components/MacroBar';
import { Card } from '@/components/ui';
import { useDailyDashboard, useAddWater } from '@/hooks/useNutrition';
import { useProfile } from '@/lib/store';
import { colors, typography, spacing, radius } from '@/theme';

export default function TodayScreen() {
  const profile = useProfile();
  const { data, isLoading, refetch } = useDailyDashboard();
  const addWater = useAddWater();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Refresh quand on revient sur l'écran (depuis modal scan/ajout)
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    }, [qc]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const consumed = data?.consumed ?? {
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    meals: 0,
  };
  const target = data?.target ?? null;
  const waterMl = data?.water_ml ?? 0;

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (!target && !isLoading) {
    // Pas de target actif — onboarding incomplet ?
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Configurer mon plan</Text>
          <Text style={styles.emptyText}>
            Termine ton onboarding pour démarrer le suivi.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Salut {profile?.full_name?.split(' ')[0] ?? ''} 👋
            </Text>
            <Text style={styles.dateText}>{today}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(modals)/add-food')}
            style={styles.headerBtn}
          >
            <Ionicons name="add" size={24} color={colors.textOnPrimary} />
          </Pressable>
        </View>

        {/* Calorie ring */}
        <View style={styles.ringSection}>
          <CalorieRing
            consumed={consumed.kcal}
            target={target?.kcal ?? 0}
          />
        </View>

        {/* Macros */}
        <Card style={styles.macrosCard}>
          <Text style={styles.cardTitle}>Macronutriments</Text>
          <View style={{ marginTop: spacing['4'] }}>
            <MacroBar
              label="Protéines"
              consumed={consumed.protein_g}
              target={target?.protein_g ?? 0}
              color={colors.protein}
            />
            <MacroBar
              label="Glucides"
              consumed={consumed.carbs_g}
              target={target?.carbs_g ?? 0}
              color={colors.carbs}
            />
            <MacroBar
              label="Lipides"
              consumed={consumed.fat_g}
              target={target?.fat_g ?? 0}
              color={colors.fat}
            />
            <MacroBar
              label="Fibres"
              consumed={consumed.fiber_g}
              target={target?.fiber_g ?? 0}
              color={colors.fiber}
            />
          </View>
        </Card>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction
            icon="barcode-outline"
            label="Scanner"
            onPress={() => router.push('/(modals)/scan')}
          />
          <QuickAction
            icon="search-outline"
            label="Rechercher"
            onPress={() => router.push('/(modals)/add-food')}
          />
          <QuickAction
            icon="restaurant-outline"
            label="Repas"
            onPress={() => router.push('/(tabs)/diary')}
          />
        </View>

        {/* Water tracker */}
        <Card style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Hydratation</Text>
              <Text style={styles.waterText}>
                <Text style={styles.waterBig}>{(waterMl / 1000).toFixed(1)}</Text>
                <Text style={styles.waterDim}>
                  {' '}/ {((target?.water_ml ?? 0) / 1000).toFixed(1)} L
                </Text>
              </Text>
            </View>
            <Ionicons name="water" size={32} color={colors.water} />
          </View>

          <View style={styles.waterButtons}>
            {[150, 250, 500].map((ml) => (
              <Pressable
                key={ml}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  addWater.mutate(ml);
                }}
                style={styles.waterBtn}
              >
                <Text style={styles.waterBtnText}>+{ml} ml</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Stat strip */}
        <View style={styles.statRow}>
          <StatChip
            label="Repas"
            value={`${consumed.meals}`}
            icon="restaurant"
          />
          <StatChip
            label="Poids"
            value={
              data?.last_weight_kg
                ? `${data.last_weight_kg.toFixed(1)} kg`
                : '—'
            }
            icon="scale"
          />
          <StatChip
            label="Objectif"
            value={
              target?.goal === 'lose_fat'
                ? 'Sèche'
                : target?.goal === 'build_muscle'
                ? 'Muscle'
                : target?.goal === 'recomp'
                ? 'Recomp'
                : 'Maintien'
            }
            icon="flag"
          />
        </View>

        <View style={{ height: spacing['10'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.quickAction,
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
      ]}
    >
      <View style={styles.quickIconCircle}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function StatChip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <View style={{ marginLeft: spacing['2'] }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['4'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['6'],
  },
  greeting: {
    color: colors.text,
    fontSize: typography.xl2,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  dateText: {
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
  ringSection: {
    alignItems: 'center',
    marginVertical: spacing['6'],
  },
  macrosCard: { marginBottom: spacing['5'] },
  cardTitle: {
    color: colors.text,
    fontSize: typography.lg,
    fontWeight: typography.weights.bold,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing['3'],
    marginBottom: spacing['5'],
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing['4'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2'],
  },
  quickLabel: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.weights.semibold,
  },
  waterCard: { marginBottom: spacing['5'] },
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterText: { marginTop: spacing['2'] },
  waterBig: {
    color: colors.water,
    fontSize: typography.xl3,
    fontWeight: typography.weights.black,
  },
  waterDim: {
    color: colors.textTertiary,
    fontSize: typography.base,
  },
  waterButtons: {
    flexDirection: 'row',
    gap: spacing['3'],
    marginTop: spacing['4'],
  },
  waterBtn: {
    flex: 1,
    paddingVertical: spacing['3'],
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  waterBtnText: {
    color: colors.water,
    fontSize: typography.sm,
    fontWeight: typography.weights.semibold,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing['3'],
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing['3'],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statLabel: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    fontWeight: typography.weights.medium,
  },
  statValue: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.weights.bold,
    marginTop: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['8'],
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing['2'],
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.base,
    textAlign: 'center',
  },
});
