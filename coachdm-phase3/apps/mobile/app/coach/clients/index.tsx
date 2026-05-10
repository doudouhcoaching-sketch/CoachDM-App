// apps/mobile/app/coach/clients/index.tsx
// ============================================================
// Coach DM · Mobile · Coach clients list (full, with filters)
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createCoachClient,
  type CoachClientStatus,
  coachI18n,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { Colors } from '@/lib/theme';

const FILTERS: Array<{ key: CoachClientStatus | 'all'; labelFr: string; labelEn: string; labelNl: string }> = [
  { key: 'active', labelFr: 'Actifs', labelEn: 'Active', labelNl: 'Actief' },
  { key: 'paused', labelFr: 'En pause', labelEn: 'Paused', labelNl: 'Gepauzeerd' },
  { key: 'archived', labelFr: 'Archivés', labelEn: 'Archived', labelNl: 'Gearchiveerd' },
  { key: 'all', labelFr: 'Tous', labelEn: 'All', labelNl: 'Alle' },
];

export default function ClientsListScreen() {
  const supabase = useSupabase();
  const { locale } = useLocale();
  const router = useRouter();

  const coach = useMemo(() => createCoachClient(supabase), [supabase]);

  const [filter, setFilter] = useState<CoachClientStatus | 'all'>('active');
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await coach.listMyClients(filter);
    setClients(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [filter]);

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (c.client_full_name ?? '').toLowerCase().includes(s) ||
      (c.client_email ?? '').toLowerCase().includes(s)
    );
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.gold,
          headerTitle: coachI18n.coachDash.my_clients[locale],
          headerRight: () => (
            <Pressable onPress={() => router.push('/coach/clients/add')}>
              <Ionicons name="person-add-outline" size={22} color={Colors.gold} />
            </Pressable>
          ),
        }}
      />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textDim} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            locale === 'fr' ? 'Rechercher…' : locale === 'en' ? 'Search…' : 'Zoeken…'
          }
          placeholderTextColor={Colors.textDim}
          style={styles.searchInput}
        />
      </View>

      {/* Filter chips */}
      <View style={styles.chips}>
        {FILTERS.map((f) => {
          const label =
            locale === 'fr' ? f.labelFr : locale === 'en' ? f.labelEn : f.labelNl;
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={Colors.gold}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/coach/clients/${item.client_user_id}`)}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>
                  {(item.client_full_name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {item.client_full_name || item.client_email}
                </Text>
                <Text style={styles.email}>{item.client_email}</Text>
                <Text style={styles.started}>
                  {locale === 'fr' ? 'Depuis' : 'Since'}{' '}
                  {new Date(item.started_at).toLocaleDateString(locale)}
                </Text>
              </View>
              <View style={[styles.statusDot, statusColor(item.status)]} />
              <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={56} color={Colors.textDim} />
              <Text style={styles.emptyText}>
                {coachI18n.coachDash.no_clients[locale]}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function statusColor(status: string) {
  if (status === 'active') return { backgroundColor: '#10B981' };
  if (status === 'paused') return { backgroundColor: '#FFC107' };
  return { backgroundColor: '#6B7280' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    paddingVertical: 10,
    fontSize: 14,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.gold },
  chipText: { color: Colors.textDim, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: Colors.background },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { color: Colors.background, fontSize: 18, fontWeight: '700' },
  name: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  email: { color: Colors.textDim, fontSize: 12, marginTop: 2 },
  started: { color: Colors.textDim, fontSize: 11, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyText: { color: Colors.textDim, fontSize: 14 },
});
