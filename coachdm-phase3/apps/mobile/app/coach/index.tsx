// apps/mobile/app/coach/index.tsx
// ============================================================
// Coach DM · Mobile · Coach dashboard
// Visible only to users with role = 'coach' or 'super_admin'
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createCoachClient,
  createCheckInsClient,
  createMessagingClient,
  coachI18n,
  type CheckInWithPhotos,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { Colors } from '@/lib/theme';

export default function CoachDashboard() {
  const supabase = useSupabase();
  const { user, profile } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();
  const i = coachI18n.coachDash;

  const coach = useMemo(() => createCoachClient(supabase), [supabase]);
  const checkIns = useMemo(() => createCheckInsClient(supabase), [supabase]);
  const messaging = useMemo(() => createMessagingClient(supabase), [supabase]);

  const [clients, setClients] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<CheckInWithPhotos[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isCoach = profile?.role === 'coach' || profile?.role === 'super_admin';

  const load = async () => {
    if (!isCoach) {
      setLoading(false);
      return;
    }
    const [clientsData, reviewsData, threads] = await Promise.all([
      coach.listMyClients('active'),
      checkIns.listPendingForCoach(),
      messaging.listThreads(),
    ]);
    setClients(clientsData);
    setPendingReviews(reviewsData);
    const unread = threads.reduce(
      (sum, t) => sum + (t.coach_user_id === user?.id ? t.coach_unread_count : 0),
      0
    );
    setUnreadCount(unread);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [isCoach]);

  if (!isCoach) {
    return (
      <View style={styles.loading}>
        <Ionicons name="lock-closed-outline" size={64} color={Colors.textDim} />
        <Text style={styles.emptyText}>
          {locale === 'fr'
            ? 'Accès réservé aux coachs'
            : locale === 'en'
              ? 'Coach access only'
              : 'Alleen voor coaches'}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
    >
      <Text style={styles.title}>{i.title[locale]}</Text>
      <Text style={styles.subtitle}>{profile?.full_name ?? 'Coach'}</Text>

      {/* ── Stats row ──────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatCard
          icon="people-outline"
          value={clients.length}
          label={i.my_clients[locale]}
          onPress={() => router.push('/coach/clients')}
        />
        <StatCard
          icon="clipboard-outline"
          value={pendingReviews.length}
          label={i.pending_reviews[locale]}
          highlight={pendingReviews.length > 0}
          onPress={() => router.push('/coach/reviews')}
        />
        <StatCard
          icon="chatbubbles-outline"
          value={unreadCount}
          label={i.new_messages[locale]}
          highlight={unreadCount > 0}
          onPress={() => router.push('/messages')}
        />
      </View>

      {/* ── Pending reviews ────────────────────────────────── */}
      {pendingReviews.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i.pending_reviews[locale]}</Text>
          {pendingReviews.slice(0, 5).map((ci) => (
            <Pressable
              key={ci.id}
              onPress={() => router.push(`/coach/checkins/${ci.id}`)}
              style={({ pressed }) => [
                styles.itemRow,
                pressed && { backgroundColor: Colors.surfacePressed },
              ]}
            >
              <View style={styles.itemDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {locale === 'fr' ? 'Check-in semaine du' : locale === 'en' ? 'Check-in week of' : 'Check-in week van'}{' '}
                  {new Date(ci.week_start_date).toLocaleDateString(locale)}
                </Text>
                <Text style={styles.itemSubtitle}>
                  {ci.submitted_at &&
                    `${locale === 'fr' ? 'Soumis' : locale === 'en' ? 'Submitted' : 'Ingediend'} ${new Date(ci.submitted_at).toLocaleDateString(locale)}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Clients ────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{i.my_clients[locale]}</Text>
          <Pressable onPress={() => router.push('/coach/clients/add')}>
            <Text style={styles.linkText}>+ {i.add_client[locale]}</Text>
          </Pressable>
        </View>
        {clients.length === 0 ? (
          <Text style={styles.emptySection}>{i.no_clients[locale]}</Text>
        ) : (
          clients.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/coach/clients/${c.client_user_id}`)}
              style={({ pressed }) => [
                styles.itemRow,
                pressed && { backgroundColor: Colors.surfacePressed },
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>
                  {(c.client_full_name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {c.client_full_name || c.client_email}
                </Text>
                <Text style={styles.itemSubtitle}>{c.client_email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({
  icon,
  value,
  label,
  highlight,
  onPress,
}: {
  icon: any;
  value: number;
  label: string;
  highlight?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        highlight && styles.statCardHighlight,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={highlight ? Colors.background : Colors.gold}
      />
      <Text
        style={[
          styles.statValue,
          highlight && { color: Colors.background },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.statLabel,
          highlight && { color: 'rgba(10,10,10,0.7)' },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: { color: Colors.textDim, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.gold },
  subtitle: { color: Colors.textDim, fontSize: 14, marginTop: 2, marginBottom: 24 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
    minHeight: 100,
  },
  statCardHighlight: { backgroundColor: Colors.gold },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
  },
  statLabel: { color: Colors.textDim, fontSize: 11, marginTop: 2 },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  linkText: { color: Colors.gold, fontSize: 14, fontWeight: '600' },
  emptySection: {
    color: Colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  itemTitle: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  itemSubtitle: { color: Colors.textDim, fontSize: 12, marginTop: 2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
});
