// ═══════════════════════════════════════════════════════════════
// COACH DM — Sign-in
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
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing } from '@/theme';
import { signinSchema } from '@coachdm/shared';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    const parse = signinSchema.safeParse({ email, password });
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
      const { error } = await supabase.auth.signInWithPassword({
        email: parse.data.email,
        password: parse.data.password,
      });
      if (error) throw error;
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[colors.bg, '#1a1408', colors.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>DM</Text>
            </View>
            <Text style={styles.brandName}>COACH DM</Text>
            <Text style={styles.tagline}>Power · Transform · Excel</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Bon retour</Text>
            <Text style={styles.subtitle}>Connectez-vous pour continuer</Text>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              error={errors.email}
            />

            <Input
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              error={errors.password}
            />

            <Button
              title="Se connecter"
              onPress={handleSubmit}
              loading={loading}
              fullWidth
              size="lg"
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            <Link href="/(auth)/sign-up" asChild>
              <Button title="Créer un compte" variant="secondary" fullWidth size="lg" />
            </Link>

            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </Link>
          </View>
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
  brand: {
    alignItems: 'center',
    marginTop: spacing['8'],
    marginBottom: spacing['12'],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['4'],
  },
  logoText: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: typography.weights.black,
    letterSpacing: 2,
  },
  brandName: {
    color: colors.text,
    fontSize: typography.xl2,
    fontWeight: typography.weights.black,
    letterSpacing: 4,
  },
  tagline: {
    color: colors.primary,
    fontSize: typography.xs,
    fontWeight: typography.weights.medium,
    letterSpacing: 3,
    marginTop: spacing['2'],
    textTransform: 'uppercase',
  },
  form: {
    gap: spacing['1'],
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
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing['5'],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 2,
    marginHorizontal: spacing['3'],
  },
  forgotLink: {
    alignSelf: 'center',
    marginTop: spacing['6'],
  },
  forgotText: {
    color: colors.primary,
    fontSize: typography.sm,
    fontWeight: typography.weights.medium,
  },
});
