// ═══════════════════════════════════════════════════════════════
// COACH DM — Onboarding step 1 : Profile
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button, Input } from '@/components/ui';
import { useOnboardingStore } from '@/lib/onboardingStore';
import { useProfile } from '@/lib/store';
import { colors, typography, spacing, radius } from '@/theme';

export default function OnboardingProfile() {
  const profile = useProfile();
  const onboarding = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  // Pré-remplir avec le nom du profil si dispo
  useEffect(() => {
    if (profile?.full_name && !onboarding.full_name) {
      onboarding.set('full_name', profile.full_name);
    }
  }, [profile?.full_name, onboarding]);

  function handleNext() {
    setError(null);
    if (onboarding.full_name.trim().length < 2) {
      setError('Nom trop court');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(onboarding.date_of_birth)) {
      setError('Date au format AAAA-MM-JJ (ex: 1990-05-12)');
      return;
    }
    if (!onboarding.sex) {
      setError('Sélectionne ton sexe biologique');
      return;
    }

    const age = (Date.now() - new Date(onboarding.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (age < 13 || age > 100) {
      setError('Âge invalide');
      return;
    }

    router.push('/(onboarding)/body');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ProgressBar step={1} total={4} />

        <Text style={styles.title}>Faisons connaissance</Text>
        <Text style={styles.subtitle}>
          Ces informations nous permettent de calculer précisément tes besoins.
        </Text>

        <Input
          label="Comment t'appelles-tu ?"
          value={onboarding.full_name}
          onChangeText={(v) => onboarding.set('full_name', v)}
          autoCapitalize="words"
          placeholder="Ton nom complet"
        />

        <Input
          label="Date de naissance"
          value={onboarding.date_of_birth}
          onChangeText={(v) => onboarding.set('date_of_birth', v)}
          placeholder="AAAA-MM-JJ"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />

        <Text style={styles.fieldLabel}>Sexe biologique</Text>
        <Text style={styles.fieldHint}>
          Important pour un calcul précis du métabolisme de base.
        </Text>

        <View style={styles.row}>
          <SexCard
            selected={onboarding.sex === 'male'}
            onPress={() => onboarding.set('sex', 'male')}
            icon="male"
            label="Homme"
          />
          <SexCard
            selected={onboarding.sex === 'female'}
            onPress={() => onboarding.set('sex', 'female')}
            icon="female"
            label="Femme"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={{ flex: 1 }} />

        <Button title="Continuer" onPress={handleNext} fullWidth size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.progress}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            i < step && styles.progressDotActive,
          ]}
        />
      ))}
    </View>
  );
}

function SexCard({
  selected,
  onPress,
  icon,
  label,
}: {
  selected: boolean;
  onPress: () => void;
  icon: 'male' | 'female';
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.sexCard, selected && styles.sexCardActive]}
    >
      <Ionicons
        name={icon === 'male' ? 'male' : 'female'}
        size={32}
        color={selected ? colors.primary : colors.textSecondary}
      />
      <Text
        style={[styles.sexLabel, selected && { color: colors.primary }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    padding: spacing['6'],
    paddingBottom: spacing['10'],
  },
  progress: {
    flexDirection: 'row',
    gap: spacing['2'],
    marginBottom: spacing['8'],
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressDotActive: { backgroundColor: colors.primary },
  title: {
    color: colors.text,
    fontSize: typography.xl3,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
    marginBottom: spacing['2'],
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.base,
    marginBottom: spacing['8'],
    lineHeight: 22,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontWeight: typography.weights.medium,
    marginTop: spacing['2'],
    marginBottom: spacing['1'],
  },
  fieldHint: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    marginBottom: spacing['3'],
  },
  row: {
    flexDirection: 'row',
    gap: spacing['3'],
    marginBottom: spacing['4'],
  },
  sexCard: {
    flex: 1,
    paddingVertical: spacing['6'],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
    gap: spacing['2'],
  },
  sexCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  sexLabel: {
    color: colors.text,
    fontSize: typography.base,
    fontWeight: typography.weights.semibold,
  },
  error: {
    color: colors.danger,
    fontSize: typography.sm,
    marginTop: spacing['2'],
  },
});
