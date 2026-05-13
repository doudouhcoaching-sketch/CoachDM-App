import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AICoachClient, t, type AIConversation } from '@coachdm/shared/ai';
import { supabase } from '../../lib/supabase';
import { useUserLang } from '../../hooks/useUserLang';

type Props = NativeStackScreenProps<any, 'AIConversationList'>;

const PALETTE = {
  bg: '#0A0A0A',
  bgCard: '#141414',
  gold: '#D4AF37',
  text: '#FAFAFA',
  textSecondary: '#9CA3AF',
  border: '#262626',
  red: '#EF4444',
};

export default function AIConversationListScreen({ navigation }: Props) {
  const { lang } = useUserLang();
  const [items, setItems] = useState<AIConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const client = React.useMemo(() => new AICoachClient(supabase), []);

  const load = useCallback(async () => {
    try {
      const rows = await client.listConversations({ limit: 50 });
      setItems(rows);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [client]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onNew = () => {
    navigation.navigate('AIChat', { conversationId: null });
  };

  const onOpen = (c: AIConversation) => {
    navigation.navigate('AIChat', { conversationId: c.id });
  };

  const onArchive = async (c: AIConversation) => {
    try {
      await client.archiveConversation(c.id);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString(lang === 'en' ? 'en-US' : lang, {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : lang, {
      day: '2-digit',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={PALETTE.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.newBtn} onPress={onNew} activeOpacity={0.85}>
        <Ionicons name="add-circle" size={22} color={PALETTE.bg} />
        <Text style={styles.newBtnText}>{t('ai.chat.new', lang)}</Text>
      </TouchableOpacity>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={items.length === 0 ? styles.emptyWrap : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={PALETTE.gold}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={56} color={PALETTE.textSecondary} />
            <Text style={styles.emptyTitle}>{t('ai.chat.empty.title', lang)}</Text>
            <Text style={styles.emptySub}>{t('ai.chat.empty.sub', lang)}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => onOpen(item)}
            activeOpacity={0.85}
            onLongPress={() => onArchive(item)}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="sparkles" size={18} color={PALETTE.gold} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title ?? t('ai.chat.untitled', lang)}
              </Text>
              <Text style={styles.rowMeta}>
                {item.intent} · {formatDate(item.last_msg_at ?? item.created_at)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={PALETTE.textSecondary} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.bg, padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PALETTE.gold,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  newBtnText: { color: PALETTE.bg, fontWeight: '800', fontSize: 15 },
  list: { paddingBottom: 32 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  emptyTitle: { color: PALETTE.text, fontWeight: '700', fontSize: 16, marginTop: 8 },
  emptySub: { color: PALETTE.textSecondary, fontSize: 13, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PALETTE.border,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PALETTE.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE.gold,
  },
  rowContent: { flex: 1 },
  rowTitle: { color: PALETTE.text, fontWeight: '700', fontSize: 15 },
  rowMeta: { color: PALETTE.textSecondary, fontSize: 12, marginTop: 2 },
});
