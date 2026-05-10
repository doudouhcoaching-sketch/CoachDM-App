// ═══════════════════════════════════════════════════════════════
// COACH DM — Modal log-weight
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { Button, Input } from '@/components/ui';
import { useAddWeight } from '@/hooks/useNutrition';
import { colors, typography, spacing } from '@/theme';

export default function LogWeightModal() {
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const addWeight = useAddWeight();

  async function handleSubmit() {
    const w = Number(weight);
    if (!w || w < 30 || w > 300) {
      Alert.alert('Poids invalide', 'Entre 30 et 300 kg.');
      return;
    }
    const bf = bodyFat ? Number(bodyFat) : undefined;
    if (bf != null && (bf < 3 || bf > 60)) {
      Alert.alert('% MG invalide', 'Entre 3 et 60%.');
      return;
    }
    try {
      await addWeight.mutateAsync({
        weight_kg: w,
        body_fat_percentage: bf,
        logged_date: format(new Date(), 'yyyy-MM-dd'),
        notes: notes || undefined,
      });
      router.back();
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Pesée du jour</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>
          Pèse-toi à la même heure (au réveil, à jeun) pour des données fiables.
        </Text>

        <Input
          label="Poids (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="78.5"
          autoFocus
        />

        <Input
          label="% masse grasse (optionnel)"
          value={bodyFat}
          onChangeText={setBodyFat}
          keyboardType="decimal-pad"
          placeholder="18"
        />

        <Input
          label="Notes (optionnel)"
          value={notes}
          onChangeText={setNotes}
          placeholder="État, ressenti, contexte…"
          multiline
          numberOfLines={3}
        />

        <Button
          title="Enregistrer"
          onPress={handleSubmit}
          loading={addWeight.isPending}
          fullWidth
          size="lg"
          style={{ marginTop: spacing['4'] }}
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
    paddingTop: spacing['4'],
    paddingBottom: spacing['10'],
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: 20,
    marginBottom: spacing['6'],
  },
});
