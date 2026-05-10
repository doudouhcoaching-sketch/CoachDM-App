// ═══════════════════════════════════════════════════════════════
// COACH DM — Profile
// ═══════════════════════════════════════════════════════════════

import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Pill } from '@/components/ui';
import { useProfile } from '@/lib/store';
import { signOut } from '@/hooks/useAuth';
import { colors, typography, spacing, radius } from '@/theme';

export default function ProfileScreen() {
  const profile = useProfile();

  function handleSignOut() {
    Alert.alert('Se déconnecter ?', 'Tu peux te reconnecter à tout moment.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'DM';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          <View style={{ marginTop: spacing['2'] }}>
            <Pill label="Coach DM Premium" variant="primary" />
          </View>
        </View>

        <Section title="Mon plan">
          <Row
            icon="calculator-outline"
            label="Recalculer mes macros"
            onPress={() => router.push('/(modals)/recalculate')}
          />
          <Row
            icon="scale-outline"
            label="Enregistrer mon poids"
            onPress={() => router.push('/(modals)/log-weight')}
          />
        </Section>

        <Section title="Abonnement">
          <Row
            icon="card-outline"
            label="Gérer mon abonnement"
            onPress={() => router.push('/(modals)/subscription')}
            badge="19,99 €/mois"
          />
        </Section>

        <Section title="Préférences">
          <Row
            icon="globe-outline"
            label="Langue"
            value={
              profile?.locale === 'fr'
                ? 'Français'
                : profile?.locale === 'nl'
                ? 'Nederlands'
                : 'English'
            }
            onPress={() => {}}
          />
          <Row
            icon="notifications-outline"
            label="Notifications"
            onPress={() => Linking.openSettings()}
          />
        </Section>

        <Section title="À propos">
          <Row
            icon="globe-outline"
            label="Site Coach DM"
            onPress={() => Linking.openURL('https://coachdm.be')}
          />
          <Row
            icon="logo-instagram"
            label="Instagram"
            onPress={() => Linking.openURL('https://instagram.com/coachdm.be')}
          />
          <Row
            icon="mail-outline"
            label="Contact"
            onPress={() => Linking.openURL('mailto:[email protected]')}
          />
          <Row
            icon="document-text-outline"
            label="CGV"
            onPress={() => Linking.openURL('https://coachdm.be/cgv')}
          />
          <Row
            icon="shield-checkmark-outline"
            label="Confidentialité"
            onPress={() => Linking.openURL('https://coachdm.be/privacy')}
          />
        </Section>

        <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </Pressable>

        <Text style={styles.footer}>
          Coach DM · Doudouh M.{'\n'}
          Coaching en ligne{'\n'}
          BCE BE0840.260.421
        </Text>

        <View style={{ height: spacing['10'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing['6'] }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>{children}</Card>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.surfaceElevated },
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.rowLabel}>{label}</Text>
      {badge && (
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>{badge}</Text>
        </View>
      )}
      {value && <Text style={styles.rowValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing['5'] },
  header: {
    alignItems: 'center',
    paddingTop: spacing['4'],
    paddingBottom: spacing['6'],
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3'],
  },
  avatarText: {
    color: colors.primary,
    fontSize: typography.xl2,
    fontWeight: typography.weights.black,
    letterSpacing: 1,
  },
  name: {
    color: colors.text,
    fontSize: typography.xl,
    fontWeight: typography.weights.bold,
  },
  email: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing['2'],
    paddingHorizontal: spacing['2'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['4'],
    gap: spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontSize: typography.base,
  },
  rowValue: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  badgePill: {
    paddingHorizontal: spacing['2'],
    paddingVertical: 4,
    backgroundColor: colors.primarySubtle,
    borderRadius: radius.full,
  },
  badgePillText: {
    color: colors.primary,
    fontSize: typography.xs,
    fontWeight: typography.weights.bold,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    marginTop: spacing['8'],
    paddingVertical: spacing['4'],
    borderRadius: radius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  signOutText: {
    color: colors.danger,
    fontSize: typography.base,
    fontWeight: typography.weights.semibold,
  },
  footer: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: typography.xs,
    lineHeight: 18,
    marginTop: spacing['8'],
  },
});
