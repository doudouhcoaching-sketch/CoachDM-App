// ═══════════════════════════════════════════════════════════════
// COACH DM — Modal abonnement
// 
// Pour MVP : explique les bénéfices et redirige vers la web app
// pour le checkout Stripe (le moins de friction pour l'instant).
// 
// Phase 2 : intégrer RevenueCat pour gérer In-App Purchase iOS/Android.
// ═══════════════════════════════════════════════════════════════

import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/ui';
import { colors, typography, spacing, radius } from '@/theme';

const FEATURES = [
  { icon: 'calculator-outline', title: 'Macros sur-mesure', desc: 'Calculées par formule Mifflin-St Jeor / Katch-McArdle.' },
  { icon: 'barcode-outline', title: 'Scan illimité', desc: 'Plus de 3 millions de produits via OpenFoodFacts.' },
  { icon: 'restaurant-outline', title: 'Journal complet', desc: 'Tracker chaque repas avec snapshots immutables.' },
  { icon: 'trending-up-outline', title: 'Progrès visuels', desc: 'Évolution poids, photos, mensurations.' },
  { icon: 'water-outline', title: 'Hydratation', desc: 'Objectif quotidien personnalisé.' },
  { icon: 'shield-checkmark-outline', title: '100% science-based', desc: 'Méthodes validées en peer-review.' },
] as const;

export default function SubscriptionModal() {
  function startCheckout() {
    Linking.openURL('https://app.coachdm.be/subscribe');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#1a1408', colors.bg]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brand}>
          <View style={styles.crown}>
            <Ionicons name="diamond" size={32} color={colors.primary} />
          </View>
          <Text style={styles.brandTitle}>Coach DM Premium</Text>
          <Text style={styles.brandSubtitle}>
            La nutrition de précision, pour atteindre tes objectifs sans deviner.
          </Text>
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceBig}>19,99 €</Text>
          <Text style={styles.pricePeriod}>par mois</Text>
          <View style={styles.trialBadge}>
            <Ionicons name="gift" size={14} color={colors.primary} />
            <Text style={styles.trialText}>7 jours gratuits</Text>
          </View>
        </View>

        <View style={{ marginTop: spacing['6'] }}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Button
          title="Démarrer mon essai gratuit"
          onPress={startCheckout}
          fullWidth
          size="lg"
          style={{ marginTop: spacing['8'] }}
        />

        <Text style={styles.legal}>
          Sans engagement. Annulation à tout moment.{'\n'}
          Paiement sécurisé via Stripe.
        </Text>
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
  scroll: {
    paddingHorizontal: spacing['5'],
    paddingBottom: spacing['10'],
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing['6'],
  },
  crown: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing['3'],
  },
  brandTitle: {
    color: colors.text,
    fontSize: typography.xl3,
    fontWeight: typography.weights.black,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.base,
    textAlign: 'center',
    marginTop: spacing['2'],
    lineHeight: 22,
  },
  priceCard: {
    alignItems: 'center',
    paddingVertical: spacing['5'],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  priceBig: {
    color: colors.primary,
    fontSize: typography.xl5,
    fontWeight: typography.weights.black,
    letterSpacing: -2,
  },
  pricePeriod: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: -4,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing['3'],
    paddingHorizontal: spacing['3'],
    paddingVertical: 6,
    backgroundColor: colors.primarySubtle,
    borderRadius: radius.full,
  },
  trialText: {
    color: colors.primary,
    fontSize: typography.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  feature: {
    flexDirection: 'row',
    gap: spacing['3'],
    paddingVertical: spacing['3'],
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    color: colors.text,
    fontSize: typography.base,
    fontWeight: typography.weights.semibold,
  },
  featureDesc: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  legal: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing['4'],
  },
});
