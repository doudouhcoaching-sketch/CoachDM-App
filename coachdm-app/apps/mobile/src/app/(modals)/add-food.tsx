// ═══════════════════════════════════════════════════════════════
// COACH DM — Modal add-food (search aliments)
// 
// Recherche full-text dans la BDD locale + bouton scan + custom.
// ═══════════════════════════════════════════════════════════════

import { useState, useDeferredValue } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Input } from '@/components/ui';
import { useFoodSearch } from '@/hooks/useNutrition';
import { useLocale } from '@/lib/store';
import { localizeFoodName, type Food } from '@coachdm/shared';
import { colors, typography, spacing, radius } from '@/theme';

export default function AddFoodModal() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const { data: foods = [], isLoading } = useFoodSearch(deferredQuery);
  const locale = useLocale();

  function handlePick(food: Food) {
    router.replace({
      pathname: '/(modals)/log-food',
      params: { foodId: food.id, name: localizeFoodName(food, locale) },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Ajouter un aliment</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un aliment…"
          autoFocus
          autoCapitalize="none"
          rightSlot={
            isLoading ? (
              <ActivityIndicator color={colors.textTertiary} size="small" />
            ) : (
              <Ionicons name="search" size={18} color={colors.textTertiary} />
            )
          }
        />
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => router.replace('/(modals)/scan')}
        >
          <Ionicons name="barcode-outline" size={20} color={colors.primary} />
          <Text style={styles.actionText}>Scanner</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => router.replace('/(modals)/custom-food')}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.actionText}>Créer un aliment</Text>
        </Pressable>
      </View>

      <FlatList
        data={foods}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] }}
        ListEmptyComponent={
          query.length < 2 ? (
            <Text style={styles.emptyHint}>
              Tape au moins 2 caractères pour commencer la recherche.
            </Text>
          ) : !isLoading ? (
            <Text style={styles.emptyHint}>Aucun résultat. Essaie avec moins de mots ou crée un aliment custom.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handlePick(item)}
            style={({ pressed }) => [
              styles.foodCard,
              pressed && { backgroundColor: colors.surfaceElevated },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{localizeFoodName(item, locale)}</Text>
              {item.brand && <Text style={styles.foodBrand}>{item.brand}</Text>}
              <Text style={styles.foodMeta}>
                {Math.round(item.kcal_per_100g)} kcal · P {item.protein_per_100g} · G{' '}
                {item.carbs_per_100g} · L {item.fat_per_100g} pour 100g
              </Text>
            </View>
            {item.is_verified && (
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      />
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
  searchWrap: {
    paddingHorizontal: spacing['5'],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing['3'],
    paddingHorizontal: spacing['5'],
    marginBottom: spacing['4'],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    paddingVertical: spacing['3'],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.weights.semibold,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    paddingVertical: spacing['3'],
    paddingHorizontal: spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  foodName: {
    color: colors.text,
    fontSize: typography.base,
    fontWeight: typography.weights.semibold,
  },
  foodBrand: {
    color: colors.textSecondary,
    fontSize: typography.xs,
    marginTop: 1,
  },
  foodMeta: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    marginTop: 4,
  },
  emptyHint: {
    color: colors.textTertiary,
    fontSize: typography.sm,
    textAlign: 'center',
    marginTop: spacing['8'],
    paddingHorizontal: spacing['6'],
    lineHeight: 20,
  },
});
