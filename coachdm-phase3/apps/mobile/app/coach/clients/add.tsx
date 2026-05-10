// apps/mobile/app/coach/clients/add.tsx
// ============================================================
// Coach DM · Mobile · Add a new client (by email)
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createCoachClient,
  coachI18n,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { Colors } from '@/lib/theme';

export default function AddClientScreen() {
  const supabase = useSupabase();
  const { locale } = useLocale();
  const router = useRouter();

  const coach = useMemo(() => createCoachClient(supabase), [supabase]);

  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<any | null>(null);
  const [searched, setSearched] = useState(false);
  const [notes, setNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  const search = async () => {
    if (!email.trim()) return;
    setSearching(true);
    setSearched(false);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .ilike('email', email.trim().toLowerCase())
        .maybeSingle();

      if (error) throw error;
      setFoundUser(data);
      setSearched(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSearching(false);
    }
  };

  const assign = async () => {
    if (!foundUser) return;
    setAssigning(true);
    try {
      await coach.assignClient(foundUser.id, notes || undefined);
      Alert.alert(
        '✓',
        locale === 'fr'
          ? 'Client ajouté'
          : locale === 'en'
            ? 'Client added'
            : 'Klant toegevoegd'
      );
      router.replace(`/coach/clients/${foundUser.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.gold,
          headerTitle: coachI18n.coachDash.add_client[locale],
        }}
      />

      <Text style={styles.label}>
        {locale === 'fr'
          ? 'Email du client'
          : locale === 'en'
            ? 'Client email'
            : 'E-mail van klant'}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="client@example.com"
          placeholderTextColor={Colors.textDim}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          onSubmitEditing={search}
        />
        <Pressable
          onPress={search}
          disabled={!email.trim() || searching}
          style={({ pressed }) => [
            styles.searchBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          {searching ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Ionicons name="search" size={20} color={Colors.background} />
          )}
        </Pressable>
      </View>

      {searched && !foundUser && (
        <View style={styles.notFoundCard}>
          <Ionicons name="alert-circle-outline" size={28} color={Colors.textDim} />
          <Text style={styles.notFoundText}>
            {locale === 'fr'
              ? "Aucun utilisateur trouvé. Le client doit d'abord créer un compte."
              : locale === 'en'
                ? 'No user found. The client must create an account first.'
                : 'Geen gebruiker gevonden. Klant moet eerst account aanmaken.'}
          </Text>
        </View>
      )}

      {foundUser && (
        <>
          <View style={styles.foundCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {(foundUser.full_name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {foundUser.full_name || foundUser.email}
              </Text>
              <Text style={styles.email}>{foundUser.email}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={Colors.gold} />
          </View>

          <Text style={[styles.label, { marginTop: 24 }]}>
            {locale === 'fr'
              ? 'Notes initiales (optionnel)'
              : locale === 'en'
                ? 'Initial notes (optional)'
                : 'Initiële notities (optioneel)'}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder={
              locale === 'fr'
                ? 'Objectifs, contraintes, blessures…'
                : 'Goals, constraints, injuries…'
            }
            placeholderTextColor={Colors.textDim}
            style={styles.notesInput}
          />

          <Pressable
            onPress={assign}
            disabled={assigning}
            style={({ pressed }) => [
              styles.confirmBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            {assigning ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.confirmBtnText}>
                {locale === 'fr'
                  ? 'Confirmer la prise en charge'
                  : locale === 'en'
                    ? 'Confirm assignment'
                    : 'Toewijzing bevestigen'}
              </Text>
            )}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  label: {
    color: Colors.textDim,
    fontSize: 13,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
  },
  searchBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.gold,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  notFoundText: {
    flex: 1,
    color: Colors.textDim,
    fontSize: 13,
    lineHeight: 18,
  },
  foundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { color: Colors.background, fontSize: 20, fontWeight: '700' },
  name: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  email: { color: Colors.textDim, fontSize: 13, marginTop: 2 },
  notesInput: {
    backgroundColor: Colors.surface,
    color: Colors.text,
    padding: 14,
    borderRadius: 10,
    minHeight: 100,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmBtnText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
});
