// ═══════════════════════════════════════════════════════════════
// COACH DM — Onboarding step 2 : Body
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import { useOnboardingStore } from '@/lib/onboardingStore';
import { colors, typography, spacing } from '@/theme';

export default function OnboardingBody() {
  const onboarding = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    setError(null);
    if (!onboarding.height_cm || onboarding.height_cm < 100 || onboarding.height_cm > 250) {
      setError('Taille entre 100 et 250 cm');
      return;
    }
    if (
      !onboarding.current_weight_kg ||
      onboarding.current_weight_kg < 30 ||
      onboarding.current_weight_kg > 300
    ) {
      setError('Poids entre 30 et 300 kg');
      return;
    }
    router.push('/(onboarding)/goal');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.title}>Tes mesures</Text>
        <Text style={styles.subtitle}>
          Données strictement privées et utilisées uniquement pour calibrer ton plan.
        </Text>

        <Input
          label="Taille (cm)"
          value={onboarding.height_cm?.toString() ?? ''}
          onChangeText={(v) => onboarding.set('height_cm', v ? Number(v) : null)}
          keyboardType="numeric"
          placeholder="175"
        />

        <Input
          label="Poids actuel (kg)"
          value={onboarding.current_weight_kg?.toString() ?? ''}
          onChangeText={(v) =>
            onboarding.set('current_weight_kg', v ? Number(v) : null)
          }
          keyboardType="decimal-pad"
          placeholder="78.5"
        />

        <Input
          label="Poids cible (kg)"
          value={onboarding.target_weight_kg?.toString() ?? ''}
          onChangeText={(v) =>
            onboarding.set('target_weight_kg', v ? Number(v) : null)
          }
          keyboardType="decimal-pad"
          placeholder="72"
        />

        <Input
          label="% masse grasse (optionnel)"
          value={onboarding.body_fat_percentage?.toString() ?? ''}
          onChangeText={(v) =>
            onboarding.set('body_fat_percentage', v ? Number(v) : null)
          }
          keyboardType="decimal-pad"
          placeholder="18"
        />
        <Text style={styles.hint}>
          Si tu connais ton pourcentage de masse grasse (impédancemètre, plis cutanés, DEXA), on utilisera la formule Katch-McArdle, plus précise que Mifflin-St Jeor.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          <Button
            title="Retour"
            onPress={() => router.back()}
            variant="ghost"
            style={{ flex: 1 }}
          />
          <Button
            title="Continuer"
            onPress={handleNext}
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
  hint: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    marginTop: -spacing['2'],
    marginBottom: spacing['4'],
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontSize: typography.sm,
    marginBottom: spacing['4'],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing['3'],
    marginTop: spacing['6'],
  },
});
