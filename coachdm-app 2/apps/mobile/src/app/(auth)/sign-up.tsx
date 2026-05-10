// ═══════════════════════════════════════════════════════════════
// COACH DM — Sign-up
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing } from '@/theme';
import { signupSchema } from '@coachdm/shared';

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    const parse = signupSchema.safeParse({
      full_name: fullName,
      email,
      password,
    });
    if (!parse.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parse.error.issues) {
        if (issue.path[0]) fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: parse.data.email,
        password: parse.data.password,
        options: {
          data: {
            full_name: parse.data.full_name,
            locale: parse.data.locale,
          },
        },
      });
      if (error) throw error;
      Alert.alert(
        'Vérifiez vos emails',
        'Un lien de confirmation vient de vous être envoyé.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }],
      );
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>
            7 jours d'essai gratuit, sans engagement.
          </Text>

          <Input
            label="Nom complet"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            error={errors.full_name}
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email}
          />

          <Input
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.password}
          />
          <Text style={styles.hint}>
            Min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
          </Text>

          <Button
            title="Créer mon compte"
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: spacing['4'] }}
          />

          <Link href="/(auth)/sign-in" style={styles.backLink}>
            <Text style={styles.backText}>Déjà un compte ? Se connecter</Text>
          </Link>

          <Text style={styles.legal}>
            En créant un compte, vous acceptez nos CGV et notre Politique de confidentialité.
            Coach DM · BCE BE0840.260.421
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing['6'],
    paddingTop: spacing['8'],
    paddingBottom: spacing['10'],
  },
  title: {
    color: colors.text,
    fontSize: typography.xl3,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.base,
    marginBottom: spacing['8'],
    marginTop: spacing['2'],
  },
  hint: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    marginTop: -spacing['2'],
    marginBottom: spacing['4'],
  },
  backLink: {
    alignSelf: 'center',
    marginTop: spacing['6'],
  },
  backText: {
    color: colors.primary,
    fontSize: typography.sm,
    fontWeight: typography.weights.medium,
  },
  legal: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing['8'],
  },
});
