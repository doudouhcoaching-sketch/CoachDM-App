// apps/mobile/app/(tabs)/messages.tsx
// ============================================================
// Coach DM · Mobile · Messages tab — thread list
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
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createMessagingClient,
  type ThreadWithParticipants,
  coachI18n,
  t as ti18n,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { Colors } from '@/lib/theme';

function relativeTime(iso: string | null, locale: 'fr' | 'en' | 'nl'): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return locale === 'fr' ? "à l'instant" : 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
  return new Date(iso).toLocaleDateString();
}

export default function MessagesScreen() {
  const supabase = useSupabase();
  const { user, profile } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();
  const isCoach = profile?.role === 'coach' || profile?.role === 'super_admin';

  const [threads, setThreads] = useState<ThreadWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const messaging = useMemo(() => createMessagingClient(supabase), [supabase]);

  const load = async () => {
    try {
      const data = await messaging.listThreads();
      setThreads(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = messaging.subscribeToThreadList(load);
    return unsub;
  }, []);

  const renderItem = ({ item }: { item: ThreadWithParticipants }) => {
    const otherName = isCoach ? item.client_display_name : item.coach_display_name;
    const otherAvatar = isCoach ? item.client_avatar_url : item.coach_avatar_url;
    const unread = isCoach ? item.coach_unread_count : item.client_unread_count;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: Colors.surfacePressed },
        ]}
        onPress={() => router.push(`/messages/${item.id}`)}
      >
        {otherAvatar ? (
          <Image source={otherAvatar} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarLetter}>
              {otherName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.rowBody}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowName} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={styles.rowTime}>
              {relativeTime(item.last_message_at, locale)}
            </Text>
          </View>
          <View style={styles.rowFooter}>
            <Text
              style={[
                styles.rowPreview,
                unread > 0 && styles.rowPreviewUnread,
              ]}
              numberOfLines={1}
            >
              {item.last_message_preview ??
                ti18n('messages', 'new_message', locale)}
            </Text>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ti18n('messages', 'title', locale)}</Text>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={threads.length === 0 && styles.emptyContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={64}
              color={Colors.textDim}
            />
            <Text style={styles.emptyText}>
              {coachI18n.messages.empty[locale]}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.gold,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: Colors.background,
    fontSize: 22,
    fontWeight: '700',
  },
  rowBody: { flex: 1 },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowName: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  rowTime: { color: Colors.textDim, fontSize: 12 },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowPreview: {
    flex: 1,
    color: Colors.textDim,
    fontSize: 14,
  },
  rowPreviewUnread: {
    color: Colors.text,
    fontWeight: '600',
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 84,
  },
  empty: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 60,
  },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyText: {
    color: Colors.textDim,
    fontSize: 16,
  },
});
