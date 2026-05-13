import React, { useCallback, useEffect, useState } from 'react';
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
import {
  AICoachClient,
  t,
  type AISessionSuggestion,
  type AISessionExercise,
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

const TIP_COLOR: Record<string, string> = {
  insight: PALETTE.green,
  warning: PALETTE.red,
  info: PALETTE.blue,
  tactic: PALETTE.violet,
};

const TIP_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  insight: 'checkmark-circle',
  warning: 'close-circle',
  info: 'information-circle',
  tactic: 'flag',
};

export default function AISessionSuggestionScreen() {
  const { lang } = useUserLang();
  const [data, setData] = useState<AISessionSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const client = React.useMemo(() => new AICoachClient(supabase), []);

  const load = useCallback(async () => {
    try {
      const row = await client.getTodaySession();
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
      // Trigger via chat with intent — the assistant calls suggest_session tool
      await client.chat({
        conversation_id: null,
        message: t('ai.chat.quick.session', lang),
        intent: 'session_suggest',
        lang,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
      setLoading(false);
    }
  };

  const onAccept = async () => {
    if (!data) return;
    setAccepting(true);
    try {
      await client.acceptSession(data.id);
      Alert.alert(t('ai.session.accepted.title', lang), t('ai.session.accepted.body', lang));
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setAccepting(false);
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
        <Ionicons name="barbell-outline" size={56} color={PALETTE.textSecondary} />
        <Text style={styles.emptyTitle}>{t('ai.session.empty.title', lang)}</Text>
        <Text style={styles.emptySub}>{t('ai.session.empty.sub', lang)}</Text>
        <TouchableOpacity style={styles.genBtn} onPress={onGenerate} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={18} color={PALETTE.bg} />
          <Text style={styles.genBtnText}>{t('ai.session.generate', lang)}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const titleField = (`title_${lang}` as keyof AISessionSuggestion);
  const title = (data[titleField] as string) ?? (data as any).title_fr;
  const rationaleField = (`rationale_${lang}` as keyof AISessionSuggestion);
  const rationale = (data[rationaleField] as string) ?? (data as any).rationale_fr;
  const exercises: AISessionExercise[] = Array.isArray(data.exercises) ? (data.exercises as any) : [];

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
      {/* Header card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.zoneBadge, { borderColor: ZONE_COLOR[data.readiness_zone] }]}>
            <View style={[styles.zoneDot, { backgroundColor: ZONE_COLOR[data.readiness_zone] }]} />
            <Text style={[styles.zoneText, { color: ZONE_COLOR[data.readiness_zone] }]}>
              {t(`ai.readiness.zone.${data.readiness_zone}`, lang)}
            </Text>
          </View>
          <Text style={styles.dateText}>{data.date}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={PALETTE.gold} />
            <Text style={styles.metaText}>{data.duration_min} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="flame-outline" size={14} color={PALETTE.gold} />
            <Text style={styles.metaText}>RPE {data.target_rpe.toFixed(1)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="layers-outline" size={14} color={PALETTE.gold} />
            <Text style={styles.metaText}>{data.kind}</Text>
          </View>
        </View>
        {rationale ? <Text style={styles.rationale}>{rationale}</Text> : null}
      </View>

      {/* Exercises */}
      <Text style={styles.sectionLabel}>{t('ai.session.exercises', lang)}</Text>
      {exercises.map((ex, idx) => {
        const exNameField = `name_${lang}` as keyof AISessionExercise;
        const exName = (ex[exNameField] as string) ?? (ex as any).name_fr ?? ex.slug;
        const tipField = `tip_${lang}` as keyof AISessionExercise;
        const tip = (ex[tipField] as string) ?? (ex as any).tip_fr;
        const tipKind = ex.tip_kind ?? 'info';
        const tipColor = TIP_COLOR[tipKind] ?? PALETTE.blue;
        const tipIcon = TIP_ICON[tipKind] ?? 'information-circle';

        return (
          <View key={`${ex.slug}-${idx}`} style={styles.exCard}>
            <View style={styles.exHeader}>
              <View style={styles.exIdx}>
                <Text style={styles.exIdxText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{exName}</Text>
                <Text style={styles.exMeta}>
                  {ex.sets} × {ex.reps} · {t('ai.session.rest', lang)} {ex.rest_s}s
                  {ex.intensity_pct ? ` · ${Math.round(ex.intensity_pct * 100)}% 1RM` : ''}
                  {ex.tempo ? ` · ${ex.tempo}` : ''}
                </Text>
              </View>
            </View>
            {tip ? (
              <View style={[styles.tip, { borderLeftColor: tipColor }]}>
                <Ionicons name={tipIcon} size={14} color={tipColor} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ) : null}
            {ex.evidence_ref ? (
              <Text style={styles.evidence}>📚 {ex.evidence_ref}</Text>
            ) : null}
          </View>
        );
      })}

      {/* Accept */}
      <TouchableOpacity
        style={[styles.acceptBtn, (data.accepted_at || accepting) && styles.acceptBtnDisabled]}
        onPress={onAccept}
        disabled={!!data.accepted_at || accepting}
        activeOpacity={0.85}
      >
        {accepting ? (
          <ActivityIndicator color={PALETTE.bg} />
        ) : (
          <>
            <Ionicons
              name={data.accepted_at ? 'checkmark-done-circle' : 'play-circle'}
              size={20}
              color={PALETTE.bg}
            />
            <Text style={styles.acceptBtnText}>
              {data.accepted_at ? t('ai.session.accepted.btn', lang) : t('ai.session.accept', lang)}
            </Text>
          </>
        )}
      </TouchableOpacity>

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

  card: {
    backgroundColor: PALETTE.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    marginBottom: 20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zoneText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateText: { color: PALETTE.textSecondary, fontSize: 12 },
  title: { color: PALETTE.text, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: PALETTE.text, fontSize: 13, fontWeight: '600' },
  rationale: { color: PALETTE.textSecondary, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },

  sectionLabel: {
    color: PALETTE.gold,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  exCard: {
    backgroundColor: PALETTE.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  exHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  exIdx: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PALETTE.bg,
    borderWidth: 1,
    borderColor: PALETTE.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exIdxText: { color: PALETTE.gold, fontWeight: '800', fontSize: 13 },
  exName: { color: PALETTE.text, fontWeight: '700', fontSize: 14, marginBottom: 3 },
  exMeta: { color: PALETTE.textSecondary, fontSize: 12 },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    paddingLeft: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
  },
  tipText: { color: PALETTE.text, fontSize: 12, lineHeight: 18, flex: 1 },
  evidence: { color: PALETTE.textSecondary, fontSize: 10, marginTop: 8, fontStyle: 'italic' },

  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PALETTE.gold,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  acceptBtnDisabled: { opacity: 0.5 },
  acceptBtnText: { color: PALETTE.bg, fontWeight: '800', fontSize: 15 },

  footerDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  footerText: { color: PALETTE.textSecondary, fontSize: 10, flex: 1, lineHeight: 14 },
});
