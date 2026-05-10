import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.includes('@')) {
      Alert.alert('Email invalide');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'coachdm://auth-callback',
      });
      if (error) throw error;
      Alert.alert(
        'Email envoyé',
        'Si un compte existe pour cet email, vous recevrez un lien de réinitialisation.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Mot de passe oublié ?</Text>
        <Text style={styles.subtitle}>
          Entrez votre email, nous vous enverrons un lien de réinitialisation.
        </Text>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button
          title="Envoyer le lien"
          onPress={handleSubmit}
          loading={loading}
          fullWidth
          size="lg"
        />
        <Button
          title="Retour"
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
          style={{ marginTop: spacing['3'] }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: spacing['6'], justifyContent: 'center' },
  title: {
    color: colors.text,
    fontSize: typography.xl3,
    fontWeight: typography.weights.bold,
    marginBottom: spacing['2'],
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.base,
    marginBottom: spacing['6'],
    lineHeight: 22,
  },
});
