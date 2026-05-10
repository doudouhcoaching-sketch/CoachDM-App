// apps/mobile/app/coach/reviews/index.tsx
// ============================================================
// Coach DM · Mobile · Pending check-in reviews list
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createCheckInsClient,
  type CheckInWithPhotos,
  coachI18n,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { Colors } from '@/lib/theme';

export default function ReviewsListScreen() {
  const supabase = useSupabase();
  const { locale } = useLocale();
  const router = useRouter();

  const checkIns = useMemo(() => createCheckInsClient(supabase), [supabase]);

  const [items, setItems] = useState<Array<CheckInWithPhotos & { client?: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    // Join with profiles to get client name
    const { data, error } = await supabase
      .from('check_ins')
      .select(`
        *,
        photos:check_in_photos(*),
        client:profiles!check_ins_client_user_id_fkey(full_name, email, avatar_url)
      `)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: true, nullsFirst: false });

    if (!error) setItems((data ?? []) as any);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const daysSince = (iso: string | null) => {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.gold,
          headerTitle: coachI18n.coachDash.pending_reviews[locale],
        }}
      />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={items}
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
          renderItem={({ item }) => {
            const days = daysSince(item.submitted_at);
            const urgent = days >= 3;
            return (
              <Pressable
                onPress={() => router.push(`/coach/checkins/${item.id}`)}
                style={({ pressed }) => [
                  styles.row,
                  urgent && styles.rowUrgent,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetter}>
                    {(item.client?.full_name ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.client?.full_name ?? item.client?.email ?? 'Client'}
                  </Text>
                  <Text style={styles.week}>
                    {locale === 'fr' ? 'Semaine du' : 'Week of'}{' '}
                    {new Date(item.week_start_date).toLocaleDateString(locale)}
                  </Text>
                  <View style={styles.metaRow}>
                    {item.weight_kg && (
                      <Text style={styles.metaPill}>⚖ {item.weight_kg}kg</Text>
                    )}
                    {item.energy_level && (
                      <Text style={styles.metaPill}>⚡ {item.energy_level}/5</Text>
                    )}
                    {item.workouts_completed !== null && (
                      <Text style={styles.metaPill}>
                        🏋 {item.workouts_completed}/{item.workouts_planned ?? '—'}
                      </Text>
                    )}
                    {item.photos?.length ? (
                      <Text style={styles.metaPill}>📸 {item.photos.length}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.rightCol}>
                  <Text
                    style={[
                      styles.daysAgo,
                      urgent && { color: '#ff6b6b' },
                    ]}
                  >
                    {days === 0
                      ? locale === 'fr' ? 'Aujourd’hui' : 'Today'
                      : `${days}j`}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={Colors.textDim}
                  />
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-outline" size={64} color={Colors.gold} />
              <Text style={styles.emptyText}>
                {locale === 'fr'
                  ? 'Tout est à jour 🎯'
                  : locale === 'en'
                    ? "You're all caught up 🎯"
                    : 'Alles bijgewerkt 🎯'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  rowUrgent: { borderLeftWidth: 3, borderLeftColor: '#ff6b6b' },
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
  week: { color: Colors.textDim, fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  metaPill: {
    color: Colors.gold,
    fontSize: 11,
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  daysAgo: { color: Colors.textDim, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 16, paddingVertical: 80 },
  emptyText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
});
