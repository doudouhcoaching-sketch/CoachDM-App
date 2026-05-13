import React, { useCallback, useState } from 'react';
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
import {
  AICoachClient,
  t,
  type AIPlanAdjustment,
  type AIAdjustmentKind,
  type AIAdjustmentStatus,
} from '@coachdm/shared/ai';
import { supabase } from '../../lib/supabase';
import { useUserLang } from '../../hooks/useUserLang';

type Props = NativeStackScreenProps<any, 'AIAdjustmentList'>;

const PALETTE = {
  bg: '#0A0A0A',
  bgCard: '#141414',
  gold: '#D4AF37',
  text: '#FAFAFA',
  textSecondary: '#9CA3AF',
  border: '#262626',
  green: '#10B981',
  red: '#EF4444',
  blue: '#38BDF8',
  violet: '#A78BFA',
  amber: '#F59E0B',
};

const KIND_COLOR: Record<AIAdjustmentKind, string> = {
  deload: PALETTE.blue,
  intensify: PALETTE.red,
  swap_exercise: PALETTE.violet,
  add_volume: PALETTE.amber,
  reduce_volume: PALETTE.blue,
  change_split: PALETTE.gold,
  add_recovery: PALETTE.green,
};

const KIND_ICON: Record<AIAdjustmentKind, keyof typeof Ionicons.glyphMap> = {
  deload: 'trending-down-outline',
  intensify: 'flame-outline',
  swap_exercise: 'swap-horizontal-outline',
  add_volume: 'add-circle-outline',
  reduce_volume: 'remove-circle-outline',
  change_split: 'grid-outline',
  add_recovery: 'bed-outline',
};

const STATUS_COLOR: Record<AIAdjustmentStatus, string> = {
  proposed: PALETTE.amber,
  accepted: PALETTE.green,
  rejected: PALETTE.red,
  applied: PALETTE.gold,
  expired: PALETTE.textSecondary,
};

export default function AIAdjustmentListScreen({ navigation }: Props) {
  const { lang } = useUserLang();
  const [items, setItems] = useState<AIPlanAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'proposed'>('proposed');
  const client = React.useMemo(() => new AICoachClient(supabase), []);

  const load = useCallback(async () => {
    try {
      const rows = await client.listAdjustments({
        status: filter === 'proposed' ? 'proposed' : undefined,
        limit: 50,
      });
      setItems(rows);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [client, filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={PALETTE.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'proposed' && styles.filterChipActive]}
          onPress={() => setFilter('proposed')}
        >
          <Text style={[styles.filterText, filter === 'proposed' && styles.filterTextActive]}>
            {t('ai.adjust.filter.proposed', lang)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            {t('ai.adjust.filter.all', lang)}
          </Text>
        </TouchableOpacity>
      </View>

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
            <Ionicons name="options-outline" size={56} color={PALETTE.textSecondary} />
            <Text style={styles.emptyTitle}>{t('ai.adjust.empty.title', lang)}</Text>
            <Text style={styles.emptySub}>{t('ai.adjust.empty.sub', lang)}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = KIND_COLOR[item.kind];
          const icon = KIND_ICON[item.kind];
          const statusColor = STATUS_COLOR[item.status];
          const summaryField = `summary_${lang}` as keyof AIPlanAdjustment;
          const summary = (item[summaryField] as string) ?? (item as any).summary_fr;
          const expiresAt = item.expires_at ? new Date(item.expires_at) : null;
          const now = new Date();
          const expSoon = expiresAt && (expiresAt.getTime() - now.getTime()) < 3 * 24 * 60 * 60 * 1000;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('AIAdjustmentDetail', { id: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { borderColor: color }]}>
                  <Ionicons name={icon} size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kindLabel}>{t(`ai.adjust.kind.${item.kind}`, lang)}</Text>
                  <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : lang, {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {t(`ai.adjust.status.${item.status}`, lang)}
                  </Text>
                </View>
              </View>
              {summary ? (
                <Text style={styles.summary} numberOfLines={2}>
                  {summary}
                </Text>
              ) : null}
              {expSoon && item.status === 'proposed' ? (
                <View style={styles.expRow}>
                  <Ionicons name="time-outline" size={11} color={PALETTE.amber} />
                  <Text style={styles.expText}>
                    {t('ai.adjust.expires.soon', lang)}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.bg, padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: PALETTE.bgCard,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  filterChipActive: { backgroundColor: PALETTE.gold, borderColor: PALETTE.gold },
  filterText: { color: PALETTE.text, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: PALETTE.bg },

  list: { paddingBottom: 32 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 12, padding: 24 },
  emptyTitle: { color: PALETTE.text, fontWeight: '700', fontSize: 16, marginTop: 8 },
  emptySub: { color: PALETTE.textSecondary, fontSize: 13, textAlign: 'center' },

  card: {
    backgroundColor: PALETTE.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PALETTE.bg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindLabel: { color: PALETTE.text, fontWeight: '700', fontSize: 14 },
  dateText: { color: PALETTE.textSecondary, fontSize: 11, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  summary: { color: PALETTE.textSecondary, fontSize: 12, lineHeight: 17 },

  expRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  expText: { color: PALETTE.amber, fontSize: 10, fontWeight: '700' },
});
