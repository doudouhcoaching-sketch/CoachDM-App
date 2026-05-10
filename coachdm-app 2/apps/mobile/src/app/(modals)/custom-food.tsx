// ═══════════════════════════════════════════════════════════════
// COACH DM — Modal custom-food
// 
// Permet de créer un aliment perso (ex: recette maison) si ni
// la BDD ni OpenFoodFacts n'a le produit.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing } from '@/theme';
import { customFoodSchema } from '@coachdm/shared';

export default function CustomFoodModal() {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const parse = customFoodSchema.safeParse({
      name_fr: name,
      brand: brand || undefined,
      kcal_per_100g: Number(kcal),
      protein_per_100g: Number(protein) || 0,
      carbs_per_100g: Number(carbs) || 0,
      fat_per_100g: Number(fat) || 0,
      fiber_per_100g: fiber ? Number(fiber) : undefined,
    });

    if (!parse.success) {
      Alert.alert('Erreur', parse.error.issues[0]?.message ?? 'Données invalides');
      return;
    }

    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('foods')
        .insert({
          ...parse.data,
          name_en: null,
          name_nl: null,
          brand: parse.data.brand ?? null,
          sugars_per_100g: null,
          saturated_fat_per_100g: null,
          fiber_per_100g: parse.data.fiber_per_100g ?? null,
          salt_per_100g: null,
          default_serving_g: parse.data.default_serving_g ?? null,
          default_serving_label_fr: null,
          default_serving_label_en: null,
          default_serving_label_nl: null,
          image_url: null,
          barcode: null,
          off_id: null,
          is_custom: true,
          is_verified: false,
          created_by: auth.user.id,
        })
        .select()
        .single();
      if (error) throw error;

      router.replace({
        pathname: '/(modals)/log-food',
        params: { foodId: data.id, name: data.name_fr },
      });
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Créer un aliment</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>
          Saisis les valeurs pour 100 g (souvent indiquées sur l'emballage).
        </Text>

        <Input label="Nom *" value={name} onChangeText={setName} placeholder="Ex: Pain maison" />
        <Input label="Marque (optionnel)" value={brand} onChangeText={setBrand} />

        <View style={styles.grid}>
          <View style={{ flex: 1 }}>
            <Input
              label="Calories *"
              value={kcal}
              onChangeText={setKcal}
              keyboardType="decimal-pad"
              rightSlot={<Text style={styles.unit}>kcal</Text>}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Protéines"
              value={protein}
              onChangeText={setProtein}
              keyboardType="decimal-pad"
              rightSlot={<Text style={styles.unit}>g</Text>}
            />
          </View>
        </View>

        <View style={styles.grid}>
          <View style={{ flex: 1 }}>
            <Input
              label="Glucides"
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="decimal-pad"
              rightSlot={<Text style={styles.unit}>g</Text>}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Lipides"
              value={fat}
              onChangeText={setFat}
              keyboardType="decimal-pad"
              rightSlot={<Text style={styles.unit}>g</Text>}
            />
          </View>
        </View>

        <Input
          label="Fibres (optionnel)"
          value={fiber}
          onChangeText={setFiber}
          keyboardType="decimal-pad"
          rightSlot={<Text style={styles.unit}>g</Text>}
        />

        <Button
          title="Créer l'aliment"
          onPress={handleCreate}
          loading={loading}
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
    paddingBottom: spacing['10'],
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: 20,
    marginBottom: spacing['5'],
  },
  grid: {
    flexDirection: 'row',
    gap: spacing['3'],
  },
  unit: {
    color: colors.textTertiary,
    fontSize: typography.sm,
  },
});
