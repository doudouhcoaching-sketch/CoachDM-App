import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import {
  AICoachClient,
  t,
  type AIRecoveryReco,
  type ReadinessZone,
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

const ZONE_COLOR: Record<ReadinessZone, string> = {
  green: PALETTE.green,
  amber: PALETTE.amber,
  red: PALETTE.red,
};

function Gauge({ score, zone }: { score: number; zone: ReadinessZone }) {
  const size = 180;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dashOffset = circ * (1 - pct);
  const color = ZONE_COLOR[zone];

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={PALETTE.border}
          strokeWidth={stroke}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.gaugeCenter}>
        <Text style={[styles.gaugeScore, { color }]}>{Math.round(score)}</Text>
        <Text style={styles.gaugeLabel}>/ 100</Text>
      </View>
    </View>
  );
}

export default function AIRecoveryTodayScreen() {
  const { lang } = useUserLang();
  const [data, setData] = useState<AIRecoveryReco | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const client = React.useMemo(() => new AICoachClient(supabase), []);

  const load = useCallback(async () => {
    try {
      const row = await client.getTodayRecovery();
      setData(row);
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

  const onGenerate = async () => {
    setLoading(true);
    try {
      await client.chat({
        conversation_id: null,
        message: t('ai.chat.quick.recovery', lang),
        intent: 'recovery_reco',
        lang,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={PALETTE.gold} size="large" />
      </View>
    );
  }

  if (!data) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.emptyWrap}
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
      >
        <Ionicons name="bed-outline" size={56} color={PALETTE.textSecondary} />
        <Text style={styles.emptyTitle}>{t('ai.recovery.empty.title', lang)}</Text>
        <Text style={styles.emptySub}>{t('ai.recovery.empty.sub', lang)}</Text>
        <TouchableOpacity style={styles.genBtn} onPress={onGenerate} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={18} color={PALETTE.bg} />
          <Text style={styles.genBtnText}>{t('ai.recovery.generate', lang)}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const recoField = `recommendation_${lang}` as keyof AIRecoveryReco;
  const reco = (data[recoField] as string) ?? (data as any).recommendation_fr;
  const protocol = (data.protocol as any) ?? {};
  const flags = data.flags ?? [];
  const contributors = (data.contributors as any) ?? {};

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
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
    >
      <View style={styles.gaugeCard}>
        <Gauge score={data.readiness_score} zone={data.readiness_zone} />
        <View style={[styles.zoneBadge, { borderColor: ZONE_COLOR[data.readiness_zone] }]}>
          <View style={[styles.zoneDot, { backgroundColor: ZONE_COLOR[data.readiness_zone] }]} />
          <Text style={[styles.zoneText, { color: ZONE_COLOR[data.readiness_zone] }]}>
            {t(`ai.readiness.zone.${data.readiness_zone}`, lang)}
          </Text>
        </View>
        <Text style={styles.dateText}>{data.date}</Text>
      </View>

      {/* Recommendation */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="bulb-outline" size={16} color={PALETTE.gold} />
          <Text style={styles.cardTitle}>{t('ai.recovery.recommendation', lang)}</Text>
        </View>
        <Text style={styles.recoText}>{reco}</Text>
      </View>

      {/* Contributors */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="layers-outline" size={16} color={PALETTE.gold} />
          <Text style={styles.cardTitle}>{t('ai.recovery.contributors', lang)}</Text>
        </View>
        <ContribRow label="ACWR" value={contributors.acwr_pts} max={30} lang={lang} />
        <ContribRow label={t('ai.recovery.sleep', lang)} value={contributors.sleep_pts} max={30} lang={lang} />
        <ContribRow label="HRV" value={contributors.hrv_pts} max={20} lang={lang} />
        <ContribRow label="RPE" value={contributors.rpe_pts} max={20} lang={lang} />
      </View>

      {/* Protocol */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="medkit-outline" size={16} color={PALETTE.gold} />
          <Text style={styles.cardTitle}>{t('ai.recovery.protocol', lang)}</Text>
        </View>
        <ProtocolRow icon="moon" label={t('ai.recovery.sleep.target', lang)} value={`${protocol.sleep_target_h ?? 8}h`} />
        <ProtocolRow icon="walk" label={t('ai.recovery.mobility', lang)} value={`${protocol.mobility_min ?? 0} min`} />
        <ProtocolRow icon="heart-outline" label={t('ai.recovery.cardio', lang)} value={`${protocol.cardio_min ?? 0} min ${protocol.cardio_zone ?? ''}`} />
        {protocol.ice_bath ? (
          <ProtocolRow icon="snow" label={t('ai.recovery.ice', lang)} value="11°C × 10 min" highlight />
        ) : null}
        {protocol.contrast_shower ? (
          <ProtocolRow icon="water-outline" label={t('ai.recovery.contrast', lang)} value="3 × 1' chaud / 30'' froid" />
        ) : null}
        {protocol.rest_day ? (
          <ProtocolRow icon="bed" label={t('ai.recovery.rest', lang)} value={t('ai.recovery.rest.value', lang)} highlight />
        ) : null}
        {protocol.carbs_g_extra ? (
          <ProtocolRow icon="restaurant-outline" label={t('ai.recovery.carbs', lang)} value={`+${protocol.carbs_g_extra}g`} />
        ) : null}
      </View>

      {/* Flags */}
      {flags.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning-outline" size={16} color={PALETTE.amber} />
            <Text style={styles.cardTitle}>{t('ai.recovery.flags', lang)}</Text>
          </View>
          {flags.map((f, i) => (
            <View key={`${f}-${i}`} style={styles.flagRow}>
              <View style={styles.flagDot} />
              <Text style={styles.flagText}>{t(`ai.recovery.flag.${f}`, lang)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footerDisclaimer}>
        <Ionicons name="information-circle-outline" size={12} color={PALETTE.textSecondary} />
        <Text style={styles.footerText}>{t('ai.disclaimer.medical', lang)}</Text>
      </View>
    </ScrollView>
  );
}

function ContribRow({ label, value, max, lang }: { label: string; value?: number; max: number; lang: 'fr' | 'en' | 'nl' }) {
  const v = typeof value === 'number' ? value : 0;
  const pct = Math.max(0, Math.min(1, v / max));
  return (
    <View style={styles.contribRow}>
      <Text style={styles.contribLabel}>{label}</Text>
      <View style={styles.contribBar}>
        <View style={[styles.contribFill, { width: `${pct * 100}%` }]} />
      </View>
      <Text style={styles.contribValue}>{v.toFixed(0)} / {max}</Text>
    </View>
  );
}

function ProtocolRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.protoRow, highlight && styles.protoRowHi]}>
      <Ionicons name={icon} size={15} color={highlight ? PALETTE.gold : PALETTE.textSecondary} />
      <Text style={[styles.protoLabel, highlight && { color: PALETTE.text }]}>{label}</Text>
      <Text style={[styles.protoValue, highlight && { color: PALETTE.gold }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  center: { alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { color: PALETTE.text, fontWeight: '700', fontSize: 16, marginTop: 8 },
  emptySub: { color: PALETTE.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 16 },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PALETTE.gold,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  genBtnText: { color: PALETTE.bg, fontWeight: '800', fontSize: 15 },

  gaugeCard: {
    backgroundColor: PALETTE.bgCard,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE.border,
    marginBottom: 16,
    gap: 12,
  },
  gaugeCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  gaugeScore: { fontSize: 44, fontWeight: '800' },
  gaugeLabel: { color: PALETTE.textSecondary, fontSize: 12, fontWeight: '600' },

  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zoneText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateText: { color: PALETTE.textSecondary, fontSize: 12 },

  card: {
    backgroundColor: PALETTE.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { color: PALETTE.text, fontWeight: '700', fontSize: 14 },
  recoText: { color: PALETTE.text, fontSize: 13, lineHeight: 19 },

  contribRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 5 },
  contribLabel: { width: 70, color: PALETTE.textSecondary, fontSize: 12, fontWeight: '600' },
  contribBar: { flex: 1, height: 6, backgroundColor: PALETTE.bg, borderRadius: 3, overflow: 'hidden' },
  contribFill: { height: 6, backgroundColor: PALETTE.gold, borderRadius: 3 },
  contribValue: { width: 60, color: PALETTE.text, fontSize: 11, fontWeight: '700', textAlign: 'right' },

  protoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  protoRowHi: { backgroundColor: PALETTE.bg, borderRadius: 8, paddingHorizontal: 8, marginVertical: 2 },
  protoLabel: { flex: 1, color: PALETTE.textSecondary, fontSize: 13 },
  protoValue: { color: PALETTE.text, fontSize: 13, fontWeight: '700' },

  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  flagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PALETTE.amber },
  flagText: { color: PALETTE.text, fontSize: 12, flex: 1 },

  footerDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  footerText: { color: PALETTE.textSecondary, fontSize: 10, flex: 1, lineHeight: 14 },
});
