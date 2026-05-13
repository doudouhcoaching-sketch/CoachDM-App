import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  AICoachClient,
  t,
  type AIPlanAdjustment,
  type AIAdjustmentStatus,
  type AIProposedChange,
  type AIEvidence,
} from '@coachdm/shared/ai';
import { supabase } from '../../lib/supabase';
import { useUserLang } from '../../hooks/useUserLang';

type Props = NativeStackScreenProps<any, 'AIAdjustmentDetail'>;

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

const STATUS_COLOR: Record<AIAdjustmentStatus, string> = {
  proposed: PALETTE.amber,
  accepted: PALETTE.green,
  rejected: PALETTE.red,
  applied: PALETTE.gold,
  expired: PALETTE.textSecondary,
};

export default function AIAdjustmentDetailScreen({ route, navigation }: Props) {
  const { lang } = useUserLang();
  const id = (route.params as any)?.id as string;
  const [data, setData] = useState<AIPlanAdjustment | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const client = React.useMemo(() => new AICoachClient(supabase), []);

  const load = useCallback(async () => {
    try {
      const rows = await client.listAdjustments({ limit: 100 });
      const row = rows.find((r) => r.id === id) ?? null;
      setData(row);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [client, id]);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (status: AIAdjustmentStatus) => {
    if (!data) return;
    setActing(true);
    try {
      await client.updateAdjustmentStatus(data.id, status);
      Alert.alert(
        t(`ai.adjust.action.${status}.title`, lang),
        t(`ai.adjust.action.${status}.body`, lang),
      );
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setActing(false);
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
      <View style={[styles.root, styles.center]}>
        <Text style={styles.errorText}>{t('ai.adjust.notfound', lang)}</Text>
      </View>
    );
  }

  const summaryField = `summary_${lang}` as keyof AIPlanAdjustment;
  const summary = (data[summaryField] as string) ?? (data as any).summary_fr;
  const rationaleField = `rationale_${lang}` as keyof AIPlanAdjustment;
  const rationale = (data[rationaleField] as string) ?? (data as any).rationale_fr;
  const proposed: AIProposedChange[] = Array.isArray(data.proposed_changes)
    ? (data.proposed_changes as any)
    : [];
  const evidence: AIEvidence[] = Array.isArray(data.evidence) ? (data.evidence as any) : [];
  const statusColor = STATUS_COLOR[data.status];
  const canAct = data.status === 'proposed';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      {/* Header */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.kindText}>{t(`ai.adjust.kind.${data.kind}`, lang)}</Text>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(`ai.adjust.status.${data.status}`, lang)}
            </Text>
          </View>
        </View>
        {summary ? <Text style={styles.summary}>{summary}</Text> : null}
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={PALETTE.textSecondary} />
          <Text style={styles.metaText}>
            {new Date(data.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : lang, {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          {data.expires_at ? (
            <>
              <Text style={styles.metaSep}>·</Text>
              <Ionicons name="time-outline" size={12} color={PALETTE.textSecondary} />
              <Text style={styles.metaText}>
                {t('ai.adjust.expires.at', lang)}{' '}
                {new Date(data.expires_at).toLocaleDateString(lang === 'en' ? 'en-US' : lang, {
                  day: '2-digit',
                  month: 'short',
                })}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Rationale */}
      {rationale ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb-outline" size={16} color={PALETTE.gold} />
            <Text style={styles.cardTitle}>{t('ai.adjust.rationale', lang)}</Text>
          </View>
          <Text style={styles.rationaleText}>{rationale}</Text>
        </View>
      ) : null}

      {/* Proposed changes */}
      {proposed.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-branch-outline" size={16} color={PALETTE.gold} />
            <Text style={styles.cardTitle}>{t('ai.adjust.changes', lang)}</Text>
          </View>
          {proposed.map((c, i) => (
            <View key={i} style={styles.changeRow}>
              <View style={styles.changeDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.changeTarget}>{c.target}</Text>
                <Text style={styles.changeDelta}>
                  {c.from !== undefined ? `${c.from} → ` : ''}
                  {c.to !== undefined ? String(c.to) : ''}
                  {c.unit ? ` ${c.unit}` : ''}
                </Text>
                {c.note ? <Text style={styles.changeNote}>{c.note}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Evidence */}
      {evidence.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="library-outline" size={16} color={PALETTE.gold} />
            <Text style={styles.cardTitle}>{t('ai.adjust.evidence', lang)}</Text>
          </View>
          {evidence.map((e, i) => (
            <View key={i} style={styles.evidenceRow}>
              <Text style={styles.evidenceRef}>
                {e.author}
                {e.year ? ` (${e.year})` : ''}
              </Text>
              {e.note ? <Text style={styles.evidenceNote}>{e.note}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {/* Validation warnings */}
      {data.validation_warnings && (data.validation_warnings as any).length > 0 ? (
        <View style={[styles.card, styles.warnCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning-outline" size={16} color={PALETTE.amber} />
            <Text style={[styles.cardTitle, { color: PALETTE.amber }]}>
              {t('ai.adjust.warnings', lang)}
            </Text>
          </View>
          {((data.validation_warnings as any) as string[]).map((w, i) => (
            <View key={i} style={styles.warnRow}>
              <View style={[styles.changeDot, { backgroundColor: PALETTE.amber }]} />
              <Text style={styles.warnText}>{w}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Actions */}
      {canAct ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn, acting && styles.actionDisabled]}
            onPress={() => doAction('rejected')}
            disabled={acting}
            activeOpacity={0.85}
          >
            <Ionicons name="close-outline" size={18} color={PALETTE.red} />
            <Text style={[styles.actionText, { color: PALETTE.red }]}>
              {t('ai.adjust.reject', lang)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn, acting && styles.actionDisabled]}
            onPress={() => doAction('accepted')}
            disabled={acting}
            activeOpacity={0.85}
          >
            {acting ? (
              <ActivityIndicator size="small" color={PALETTE.bg} />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={18} color={PALETTE.bg} />
                <Text style={[styles.actionText, { color: PALETTE.bg }]}>
                  {t('ai.adjust.accept', lang)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : data.status === 'accepted' ? (
        <TouchableOpacity
          style={[styles.applyBtn, acting && styles.actionDisabled]}
          onPress={() => doAction('applied')}
          disabled={acting}
          activeOpacity={0.85}
        >
          {acting ? (
            <ActivityIndicator size="small" color={PALETTE.bg} />
          ) : (
            <>
              <Ionicons name="checkmark-done-outline" size={18} color={PALETTE.bg} />
              <Text style={[styles.actionText, { color: PALETTE.bg }]}>
                {t('ai.adjust.apply', lang)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      <View style={styles.footerDisclaimer}>
        <Ionicons name="information-circle-outline" size={12} color={PALETTE.textSecondary} />
        <Text style={styles.footerText}>{t('ai.disclaimer.medical', lang)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  errorText: { color: PALETTE.red, fontSize: 14 },

  card: {
    backgroundColor: PALETTE.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    marginBottom: 12,
  },
  warnCard: { borderColor: PALETTE.amber },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { color: PALETTE.text, fontWeight: '700', fontSize: 14 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  kindText: { color: PALETTE.text, fontSize: 18, fontWeight: '800', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  summary: { color: PALETTE.text, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: PALETTE.textSecondary, fontSize: 11 },
  metaSep: { color: PALETTE.textSecondary, fontSize: 11, marginHorizontal: 4 },

  rationaleText: { color: PALETTE.text, fontSize: 13, lineHeight: 19 },

  changeRow: { flexDirection: 'row', gap: 10, paddingVertical: 6, alignItems: 'flex-start' },
  changeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PALETTE.gold, marginTop: 6 },
  changeTarget: { color: PALETTE.text, fontWeight: '700', fontSize: 13 },
  changeDelta: { color: PALETTE.gold, fontSize: 12, fontWeight: '700', marginTop: 2 },
  changeNote: { color: PALETTE.textSecondary, fontSize: 11, marginTop: 2, fontStyle: 'italic' },

  evidenceRow: { paddingVertical: 6 },
  evidenceRef: { color: PALETTE.gold, fontSize: 12, fontWeight: '700' },
  evidenceNote: { color: PALETTE.textSecondary, fontSize: 11, marginTop: 2, lineHeight: 16 },

  warnRow: { flexDirection: 'row', gap: 10, paddingVertical: 4, alignItems: 'flex-start' },
  warnText: { color: PALETTE.text, fontSize: 12, flex: 1, lineHeight: 17 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  rejectBtn: { backgroundColor: PALETTE.bgCard, borderColor: PALETTE.red },
  acceptBtn: { backgroundColor: PALETTE.gold, borderColor: PALETTE.gold },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: PALETTE.gold,
  },
  actionText: { fontSize: 14, fontWeight: '800' },
  actionDisabled: { opacity: 0.5 },

  footerDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  footerText: { color: PALETTE.textSecondary, fontSize: 10, flex: 1, lineHeight: 14 },
});
