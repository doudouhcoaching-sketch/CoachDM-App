// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Mobile · HydrationScreen
// ═══════════════════════════════════════════════════════════════════════════
// Suivi de l'hydratation : ajout rapide (verre/bouteille/grand), custom,
// progression vers l'objectif, paramètres rappels, historique
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput,
  Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { theme } from '../../lib/theme';
import { CDMIcon } from '../../components/CDMIcon';
import { InsightCard } from '../../components/recovery/InsightCard';
import { hydrationStatus, hydrationInsights } from '@coachdm/shared/recovery';
import type {
  HydrationDaily, HydrationEntry, HydrationTarget,
} from '@coachdm/shared/recovery';

type Props = NativeStackScreenProps<any, 'Hydration'>;

const QUICK_AMOUNTS = [
  { label: 'glass', icon: 'coffee', ml: 250 },
  { label: 'bottle', icon: 'droplet', ml: 500 },
  { label: 'large_bottle', icon: 'flask', ml: 750 },
];

export function HydrationScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<HydrationTarget | null>(null);
  const [entries, setEntries] = useState<HydrationEntry[]>([]);
  const [history, setHistory] = useState<HydrationDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const [tgtRes, entRes, hisRes] = await Promise.all([
      supabase.from('hydration_targets').select('*').eq('user_id', user.id).single(),
      supabase.from('hydration_entries').select('*').eq('user_id', user.id).eq('drank_date', today)
        .order('drank_at', { ascending: false }),
      supabase.from('hydration_daily').select('*').eq('user_id', user.id)
        .gte('drank_date', cutoffStr).order('drank_date', { ascending: false }),
    ]);

    setTarget(tgtRes.data);
    setEntries(entRes.data ?? []);
    setHistory(hisRes.data ?? []);
    setLoading(false);
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = entries.reduce((s, e) => s + e.amount_ml, 0);
  const targetMl = target?.target_ml ?? 2500;
  const status = hydrationStatus(total, targetMl);
  const hourLocal = new Date().getHours();
  const insights = hydrationInsights(status, hourLocal);

  const addAmount = async (ml: number, source: 'manual' | 'quick_add' = 'quick_add') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const drank_at = new Date().toISOString();
    const drank_date = drank_at.slice(0, 10);

    const { error } = await supabase.from('hydration_entries').insert({
      user_id: user.id,
      amount_ml: ml,
      drank_at,
      drank_date,
      source,
    });

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      load();
    }
  };

  const removeEntry = async (id: string) => {
    const { error } = await supabase.from('hydration_entries').delete().eq('id', id);
    if (!error) load();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.gold} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('recovery.hydration.title')}</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <CDMIcon name="settings" size={22} color={theme.gold} />
        </TouchableOpacity>
      </View>

      {/* Big circular progress */}
      <View style={styles.progressCard}>
        <View style={styles.bigCircle}>
          <CircularProgress percent={Math.min(100, status.percent)} />
          <View style={styles.circleInner}>
            <Text style={styles.totalValue}>
              {(status.total_ml / 1000).toFixed(1)}
            </Text>
            <Text style={styles.totalUnit}>L</Text>
          </View>
        </View>
        <Text style={styles.targetLabel}>
          {t('recovery.hydration.target')}: {(targetMl / 1000).toFixed(1)} L
        </Text>
        <Text style={[
          styles.remainingLabel,
          status.status === 'reached' && { color: theme.green },
        ]}>
          {status.status === 'reached'
            ? t('recovery.hydration.target_reached')
            : `${t('recovery.hydration.remaining')}: ${status.remaining_ml} ml`}
        </Text>
      </View>

      {/* Quick add buttons */}
      <Text style={styles.sectionTitle}>{t('recovery.hydration.quick_add')}</Text>
      <View style={styles.quickRow}>
        {QUICK_AMOUNTS.map((q) => (
          <TouchableOpacity
            key={q.label}
            style={styles.quickBtn}
            onPress={() => addAmount(q.ml)}
          >
            <CDMIcon name={q.icon} size={28} color="#38BDF8" />
            <Text style={styles.quickLabel}>
              {t(`recovery.hydration.${q.label}`)}
            </Text>
            <Text style={styles.quickAmount}>{q.ml} ml</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.quickBtn} onPress={() => setShowCustom(true)}>
          <CDMIcon name="plus" size={28} color={theme.gold} />
          <Text style={styles.quickLabel}>{t('recovery.hydration.custom_amount')}</Text>
          <Text style={styles.quickAmount}>—</Text>
        </TouchableOpacity>
      </View>

      {/* Insights */}
      {insights.map((ins, i) => (
        <InsightCard key={i} insight={ins} />
      ))}

      {/* Today's entries */}
      <Text style={styles.sectionTitle}>{t('recovery.hydration.today')}</Text>
      {entries.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>—</Text>
        </View>
      ) : (
        entries.map((e) => (
          <View key={e.id} style={styles.entryRow}>
            <CDMIcon
              name={
                e.source === 'healthkit' ? 'smartphone' :
                e.source === 'google_fit' ? 'smartphone' : 'droplet'
              }
              size={16}
              color="#38BDF8"
            />
            <Text style={styles.entryAmount}>{e.amount_ml} ml</Text>
            <Text style={styles.entryTime}>
              {new Date(e.drank_at).toLocaleTimeString('fr-BE', {
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
            {e.source === 'manual' || e.source === 'quick_add' ? (
              <TouchableOpacity onPress={() => removeEntry(e.id)} style={styles.entryDelete}>
                <CDMIcon name="x" size={16} color={theme.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        ))
      )}

      {/* History */}
      <Text style={styles.sectionTitle}>14 jours</Text>
      {history.map((d) => {
        const pct = (d.total_ml / targetMl) * 100;
        return (
          <View key={d.drank_date} style={styles.histRow}>
            <Text style={styles.histDate}>{d.drank_date}</Text>
            <View style={styles.histBarBg}>
              <View style={[
                styles.histBarFill,
                { width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? theme.green : '#38BDF8' },
              ]} />
            </View>
            <Text style={styles.histValue}>{(d.total_ml / 1000).toFixed(1)} L</Text>
          </View>
        );
      })}

      <CustomAmountModal
        visible={showCustom}
        onClose={() => setShowCustom(false)}
        onAdd={(ml) => { setShowCustom(false); addAmount(ml, 'manual'); }}
      />

      <SettingsModal
        visible={showSettings}
        target={target}
        onClose={() => setShowSettings(false)}
        onSaved={() => { setShowSettings(false); load(); }}
      />
    </ScrollView>
  );
}

// ─── Circular progress (sans dépendance svg) ────────────────────────────────
function CircularProgress({ percent }: { percent: number }) {
  // Approximation : cercle entier + arc-overlay via 2 demi-cercles tournants
  // Pour rester simple : on dessine un cercle plein avec un overlay opaque
  const safe = Math.max(0, Math.min(100, percent));
  return (
    <View style={progressStyles.outer}>
      <View style={progressStyles.bg} />
      <View style={[progressStyles.fill, { height: `${safe}%` }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  outer: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: theme.bg, overflow: 'hidden',
    borderWidth: 4, borderColor: '#38BDF833',
    justifyContent: 'flex-end',
  },
  bg: { ...StyleSheet.absoluteFillObject },
  fill: {
    backgroundColor: '#38BDF866',
    width: '100%',
  },
});

// ─── Custom amount modal ────────────────────────────────────────────────────
function CustomAmountModal({
  visible, onClose, onAdd,
}: { visible: boolean; onClose: () => void; onAdd: (ml: number) => void }) {
  const [val, setVal] = useState('');
  const submit = () => {
    const ml = parseInt(val, 10);
    if (Number.isFinite(ml) && ml >= 50 && ml <= 2000) {
      onAdd(ml);
      setVal('');
    } else {
      Alert.alert('⚠️', '50 - 2000 ml');
    }
  };
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.box}>
          <Text style={modalStyles.title}>Quantité (ml)</Text>
          <TextInput
            value={val}
            onChangeText={setVal}
            keyboardType="numeric"
            placeholder="500"
            placeholderTextColor={theme.muted}
            style={modalStyles.input}
            autoFocus
          />
          <View style={modalStyles.actions}>
            <TouchableOpacity onPress={onClose} style={[modalStyles.btn, modalStyles.btnSecondary]}>
              <Text style={{ color: theme.text }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} style={[modalStyles.btn, modalStyles.btnPrimary]}>
              <Text style={{ color: '#000', fontWeight: '700' }}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Settings modal ─────────────────────────────────────────────────────────
function SettingsModal({
  visible, target, onClose, onSaved,
}: { visible: boolean; target: HydrationTarget | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [targetMl, setTargetMl] = useState(target?.target_ml?.toString() ?? '2500');
  const [intervalMin, setIntervalMin] = useState(target?.reminder_interval_min?.toString() ?? '120');
  const [enabled, setEnabled] = useState(target?.reminder_enabled ?? true);
  const [start, setStart] = useState(target?.reminder_start?.slice(0, 5) ?? '08:00');
  const [end, setEnd] = useState(target?.reminder_end?.slice(0, 5) ?? '21:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setTargetMl(target.target_ml.toString());
      setIntervalMin(target.reminder_interval_min.toString());
      setEnabled(target.reminder_enabled);
      setStart(target.reminder_start.slice(0, 5));
      setEnd(target.reminder_end.slice(0, 5));
    }
  }, [target]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ml = parseInt(targetMl, 10);
      const interval = parseInt(intervalMin, 10);

      if (!Number.isFinite(ml) || ml < 500 || ml > 8000) {
        Alert.alert('⚠️', '500 - 8000 ml');
        return;
      }
      if (!Number.isFinite(interval) || interval < 30 || interval > 360) {
        Alert.alert('⚠️', '30 - 360 min');
        return;
      }

      const { error } = await supabase
        .from('hydration_targets')
        .upsert({
          user_id: user.id,
          target_ml: ml,
          reminder_enabled: enabled,
          reminder_start: `${start}:00`,
          reminder_end: `${end}:00`,
          reminder_interval_min: interval,
        });

      if (error) Alert.alert('Erreur', error.message);
      else onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>⚙️ Paramètres</Text>

          <Text style={modalStyles.label}>{t('recovery.hydration.target')} (ml)</Text>
          <TextInput
            value={targetMl}
            onChangeText={setTargetMl}
            keyboardType="numeric"
            style={modalStyles.input}
          />

          <View style={modalStyles.row}>
            <Text style={[modalStyles.label, { flex: 1 }]}>{t('recovery.hydration.reminders')}</Text>
            <TouchableOpacity
              onPress={() => setEnabled(!enabled)}
              style={[modalStyles.toggle, enabled && modalStyles.toggleOn]}
            >
              <View style={[modalStyles.toggleKnob, enabled && modalStyles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>

          {enabled && (
            <>
              <View style={modalStyles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.label}>Début</Text>
                  <TextInput value={start} onChangeText={setStart} style={modalStyles.input} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={modalStyles.label}>Fin</Text>
                  <TextInput value={end} onChangeText={setEnd} style={modalStyles.input} />
                </View>
              </View>

              <Text style={modalStyles.label}>{t('recovery.hydration.reminder_interval')} (min)</Text>
              <TextInput
                value={intervalMin}
                onChangeText={setIntervalMin}
                keyboardType="numeric"
                style={modalStyles.input}
              />
            </>
          )}

          <View style={modalStyles.actions}>
            <TouchableOpacity onPress={onClose} style={[modalStyles.btn, modalStyles.btnSecondary]}>
              <Text style={{ color: theme.text }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} disabled={saving} style={[modalStyles.btn, modalStyles.btnPrimary]}>
              {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={{ color: '#000', fontWeight: '700' }}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: theme.gold, fontSize: 28, fontWeight: '900' },

  progressCard: {
    alignItems: 'center', paddingVertical: 24,
    backgroundColor: theme.surface, borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#38BDF833',
  },
  bigCircle: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center' },
  circleInner: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  totalValue: { color: theme.text, fontSize: 56, fontWeight: '900' },
  totalUnit: { color: theme.muted, fontSize: 14, marginTop: -8 },
  targetLabel: { color: theme.muted, fontSize: 12, marginTop: 12 },
  remainingLabel: { color: '#38BDF8', fontSize: 14, fontWeight: '600', marginTop: 4 },

  sectionTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginVertical: 12 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    flex: 1, minWidth: '45%',
    backgroundColor: theme.surface, borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: theme.muted + '22',
  },
  quickLabel: { color: theme.text, fontSize: 12, marginTop: 8, textAlign: 'center' },
  quickAmount: { color: theme.muted, fontSize: 11, marginTop: 2 },

  emptyBox: { padding: 16, alignItems: 'center' },
  emptyText: { color: theme.muted, fontSize: 24 },

  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: theme.surface, borderRadius: 8, marginBottom: 6,
  },
  entryAmount: { color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 },
  entryTime: { color: theme.muted, fontSize: 12 },
  entryDelete: { padding: 4 },

  histRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  histDate: { color: theme.muted, fontSize: 11, width: 80 },
  histBarBg: { flex: 1, height: 8, backgroundColor: theme.muted + '22', borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  histBarFill: { height: 8, borderRadius: 4 },
  histValue: { color: theme.text, fontSize: 12, fontWeight: '600', width: 60, textAlign: 'right' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  box: { backgroundColor: theme.surface, borderRadius: 16, margin: 20, padding: 20 },
  handle: { width: 40, height: 4, backgroundColor: theme.muted, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { color: theme.gold, fontSize: 20, fontWeight: '900', marginBottom: 16 },
  label: { color: theme.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: theme.bg, borderRadius: 8, padding: 12, color: theme.text, fontSize: 14, borderWidth: 1, borderColor: theme.muted + '22' },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: theme.muted + '44', padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: theme.gold },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleKnobOn: { transform: [{ translateX: 20 }] },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnSecondary: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.muted + '33' },
  btnPrimary: { backgroundColor: theme.gold },
});
