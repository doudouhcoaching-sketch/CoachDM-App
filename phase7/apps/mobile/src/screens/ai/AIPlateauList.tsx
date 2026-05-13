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
import { Ionicons } from '@expo/vector-icons';
import {
  AICoachClient,
  t,
  type AIPlateauDetection,
  type AIPlateauMetric,
} from '@coachdm/shared/ai';
import { supabase } from '../../lib/supabase';
import { useUserLang } from '../../hooks/useUserLang';

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

const METRIC_COLOR: Record<AIPlateauMetric, string> = {
  strength: PALETTE.red,
  volume: PALETTE.amber,
  bodyweight: PALETTE.blue,
  pr_count: PALETTE.violet,
  rpe_drift: PALETTE.green,
};

const METRIC_ICON: Record<AIPlateauMetric, keyof typeof Ionicons.glyphMap> = {
  strength: 'barbell-outline',
  volume: 'stats-chart-outline',
  bodyweight: 'body-outline',
  pr_count: 'trophy-outline',
  rpe_drift: 'pulse-outline',
};

export default function AIPlateauListScreen() {
  const { lang } = useUserLang();
  const [items, setItems] = useState<AIPlateauDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const client = React.useMemo(() => new AICoachClient(supabase), []);

  const load = useCallback(async () => {
    try {
      const rows = await client.listPlateaus({ resolved: false, limit: 50 });
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

  const onScan = async () => {
    setScanning(true);
    try {
      await client.scanPlateaus();
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setScanning(false);
    }
  };

  const onResolve = (p: AIPlateauDetection) => {
    Alert.alert(
      t('ai.plateau.resolve.title', lang),
      t('ai.plateau.resolve.body', lang),
      [
        { text: t('ai.plateau.resolve.cancel', lang), style: 'cancel' },
        {
          text: t('ai.plateau.resolve.confirm', lang),
          style: 'destructive',
          onPress: async () => {
            try {
              await client.resolvePlateau(p.id);
              load();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? String(e));
            }
          },
        },
      ],
    );
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
      <TouchableOpacity
        style={[styles.scanBtn, scanning && styles.scanBtnDisabled]}
        onPress={onScan}
        disabled={scanning}
        activeOpacity={0.85}
      >
        {scanning ? (
          <ActivityIndicator color={PALETTE.bg} size="small" />
        ) : (
          <Ionicons name="search-outline" size={18} color={PALETTE.bg} />
        )}
        <Text style={styles.scanBtnText}>
          {scanning ? t('ai.plateau.scanning', lang) : t('ai.plateau.scan', lang)}
        </Text>
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
            <Ionicons name="checkmark-circle-outline" size={56} color={PALETTE.green} />
            <Text style={styles.emptyTitle}>{t('ai.plateau.empty.title', lang)}</Text>
            <Text style={styles.emptySub}>{t('ai.plateau.empty.sub', lang)}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = METRIC_COLOR[item.metric];
          const icon = METRIC_ICON[item.metric];
          const insightField = `insight_${lang}` as keyof AIPlateauDetection;
          const insight = (item[insightField] as string) ?? (item as any).insight_fr;
          const confidence = item.confidence ?? 0;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { borderColor: color }]}>
                  <Ionicons name={icon} size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metricLabel}>
                    {t(`ai.plateau.metric.${item.metric}`, lang)}
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(item.detected_at).toLocaleDateString(lang === 'en' ? 'en-US' : lang, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' · '}
                    {item.window_days}j
                  </Text>
                </View>
                <View style={styles.confBadge}>
                  <Text style={[styles.confText, { color }]}>
                    {Math.round(confidence * 100)}%
                  </Text>
                </View>
              </View>

              {insight ? <Text style={styles.insightText}>{insight}</Text> : null}

              {item.recommended_action ? (
                <View style={styles.actionRow}>
                  <Ionicons name="bulb-outline" size={13} color={PALETTE.gold} />
                  <Text style={styles.actionText}>
                    {t(`ai.plateau.action.${item.recommended_action}`, lang)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.resolveBtn}
                  onPress={() => onResolve(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-done-outline" size={14} color={PALETTE.green} />
                  <Text style={styles.resolveBtnText}>{t('ai.plateau.mark.resolved', lang)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.bg, padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PALETTE.gold,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 16,
  },
  scanBtnDisabled: { opacity: 0.6 },
  scanBtnText: { color: PALETTE.bg, fontWeight: '800', fontSize: 14 },

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
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PALETTE.bg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: { color: PALETTE.text, fontWeight: '700', fontSize: 14 },
  dateText: { color: PALETTE.textSecondary, fontSize: 11, marginTop: 2 },
  confBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: PALETTE.bg,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  confText: { fontSize: 12, fontWeight: '800' },

  insightText: { color: PALETTE.text, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: PALETTE.border,
    marginBottom: 10,
  },
  actionText: { color: PALETTE.gold, fontSize: 12, fontWeight: '600', flex: 1 },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: PALETTE.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE.green,
  },
  resolveBtnText: { color: PALETTE.green, fontSize: 12, fontWeight: '700' },
});
