// ═══════════════════════════════════════════════════════════════
// COACH DM — Onboarding step 3 : Goal
// ═══════════════════════════════════════════════════════════════

import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui';
import { useOnboardingStore } from '@/lib/onboardingStore';
import { colors, typography, spacing, radius } from '@/theme';
import type { NutritionGoal } from '@coachdm/shared';

const goals: Array<{
  id: NutritionGoal;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: 'lose_fat',
    title: 'Perdre du gras',
    desc: 'Déficit de 20%, protéines hautes pour préserver le muscle.',
    icon: 'flame',
  },
  {
    id: 'maintain',
    title: 'Maintenir',
    desc: 'Stabiliser ton poids et tes performances.',
    icon: 'pulse',
  },
  {
    id: 'build_muscle',
    title: 'Prendre du muscle',
    desc: 'Surplus contrôlé de 10%, optimisé pour la croissance.',
    icon: 'barbell',
  },
  {
    id: 'recomp',
    title: 'Recomposition',
    desc: 'Perdre du gras + gagner du muscle simultanément.',
    icon: 'sync',
  },
];

export default function OnboardingGoal() {
  const onboarding = useOnboardingStore();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.title}>Ton objectif principal</Text>
        <Text style={styles.subtitle}>
          On adapte tes calories, tes protéines, et toute la stratégie selon ton choix.
        </Text>

        <View style={{ gap: spacing['3'] }}>
          {goals.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => onboarding.set('goal', g.id)}
              style={[
                styles.card,
                onboarding.goal === g.id && styles.cardActive,
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  onboarding.goal === g.id && styles.iconCircleActive,
                ]}
              >
                <Ionicons
                  name={g.icon}
                  size={22}
                  color={
                    onboarding.goal === g.id ? colors.textOnPrimary : colors.primary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{g.title}</Text>
                <Text style={styles.cardDesc}>{g.desc}</Text>
              </View>
              {onboarding.goal === g.id && (
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
            title="Continuer"
            onPress={() => router.push('/(onboarding)/activity')}
            size="lg"
            disabled={!onboarding.goal}
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
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: { backgroundColor: colors.primary },
  cardTitle: {
    color: colors.text,
    fontSize: typography.base,
    fontWeight: typography.weights.semibold,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing['3'],
    marginTop: spacing['8'],
  },
});
