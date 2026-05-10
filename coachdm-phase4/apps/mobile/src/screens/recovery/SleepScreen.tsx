// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Mobile · SleepScreen
// ═══════════════════════════════════════════════════════════════════════════
// Logger sa nuit + voir l'historique 14 jours + sync HealthKit/Health Connect
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { theme } from '../../lib/theme';
import { CDMIcon } from '../../components/CDMIcon';
import { InsightCard } from '../../components/recovery/InsightCard';
import { HealthSync } from '../../lib/health/HealthSync';
import { sleepInsights, formatDuration, avgSleepMinutes } from '@coachdm/shared/recovery';
import type { SleepSession, SleepSessionInput } from '@coachdm/shared/recovery';

type Props = NativeStackScreenProps<any, 'Sleep'>;

export function SleepScreen({ navigation }: Props) {
  const { t, lang } = useTranslation();
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const { data } = await supabase
      .from('sleep_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('sleep_date', cutoff.toISOString().slice(0, 10))
      .order('sleep_date', { ascending: false });

    setSessions(data ?? []);
    setLoading(false);

    setLastSync(await HealthSync.getLastSync());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSync = async () => {
    setSyncing(true);
    try {
      const result = await HealthSync.syncAll(30);
      if (result.errors.length > 0) {
        Alert.alert('Sync', result.errors.join('\n'));
      } else {
        Alert.alert(
          t('recovery.health.sync_success'),
          `${result.sleep} sleep · ${result.hydration} hydration · ${result.hrv} HRV`
        );
      }
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const lastNight = sessions[0];
  const today = new Date().toISOString().slice(0, 10);
  const lastNightLogged = lastNight && lastNight.sleep_date === today;

  const insights = lastNightLogged && lastNight ? sleepInsights(lastNight, sessions) : [];
  const avg7 = avgSleepMinutes(sessions, 7);

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
        <Text style={styles.title}>{t('recovery.sleep.title')}</Text>
        <TouchableOpacity onPress={onSync} disabled={syncing} style={styles.syncBtn}>
          {syncing ? (
            <ActivityIndicator size="small" color={theme.gold} />
          ) : (
            <>
              <CDMIcon name="refresh-cw" size={14} color={theme.gold} />
              <Text style={styles.syncBtnText}>
                {Platform.OS === 'ios' ? t('recovery.health.healthkit') : t('recovery.health.google_fit')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {lastSync && (
        <Text style={styles.lastSync}>
          {t('recovery.health.last_sync')}: {lastSync.toLocaleString(lang)}
        </Text>
      )}

      {/* Dernière nuit */}
      <View style={styles.lastNightCard}>
        <Text style={styles.cardLabel}>
          {lastNightLogged ? today : t('recovery.sleep.no_session')}
        </Text>
        {lastNightLogged && lastNight ? (
          <>
            <Text style={styles.bigDuration}>{formatDuration(lastNight.duration_min)}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('recovery.sleep.bedtime')}</Text>
                <Text style={styles.metaValue}>
                  {new Date(lastNight.bedtime).toLocaleTimeString(lang, {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('recovery.sleep.wake_time')}</Text>
                <Text style={styles.metaValue}>
                  {new Date(lastNight.wake_time).toLocaleTimeString(lang, {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              {lastNight.hrv_rmssd_ms !== null && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>HRV</Text>
                  <Text style={styles.metaValue}>{Math.round(lastNight.hrv_rmssd_ms)} ms</Text>
                </View>
              )}
            </View>
            {(lastNight.deep_min || lastNight.rem_min || lastNight.light_min) && (
              <View style={styles.phasesRow}>
                {lastNight.deep_min ? (
                  <View style={styles.phaseChip}>
                    <Text style={styles.phaseLabel}>Deep</Text>
                    <Text style={styles.phaseValue}>{formatDuration(lastNight.deep_min)}</Text>
                  </View>
                ) : null}
                {lastNight.rem_min ? (
                  <View style={styles.phaseChip}>
                    <Text style={styles.phaseLabel}>REM</Text>
                    <Text style={styles.phaseValue}>{formatDuration(lastNight.rem_min)}</Text>
                  </View>
                ) : null}
                {lastNight.light_min ? (
                  <View style={styles.phaseChip}>
                    <Text style={styles.phaseLabel}>Light</Text>
                    <Text style={styles.phaseValue}>{formatDuration(lastNight.light_min)}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </>
        ) : (
          <TouchableOpacity style={styles.logBtn} onPress={() => setShowLogModal(true)}>
            <CDMIcon name="plus" size={18} color="#000" />
            <Text style={styles.logBtnText}>{t('recovery.sleep.log_night')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Insights */}
      {insights.map((ins, i) => (
        <InsightCard key={i} insight={ins} />
      ))}

      {/* Moyenne 7j */}
      <View style={styles.avgCard}>
        <Text style={styles.cardLabel}>{t('recovery.sleep.avg_7d')}</Text>
        <Text style={styles.avgValue}>{formatDuration(avg7)}</Text>
        <Text style={styles.cardLabel}>{t('recovery.sleep.target')}</Text>
      </View>

      {/* Historique */}
      <Text style={styles.sectionTitle}>30 jours</Text>
      {sessions.map((s) => (
        <View key={s.id} style={styles.histRow}>
          <Text style={styles.histDate}>{s.sleep_date}</Text>
          <View style={styles.histBarBg}>
            <View
              style={[
                styles.histBarFill,
                {
                  width: `${Math.min(100, (s.duration_min / 540) * 100)}%`,
                  backgroundColor:
                    s.duration_min < 360 ? theme.red :
                    s.duration_min < 420 ? theme.gold :
                    theme.green,
                },
              ]}
            />
          </View>
          <Text style={styles.histValue}>{formatDuration(s.duration_min)}</Text>
          <Text style={styles.histSource}>
            {s.source === 'healthkit' ? '🍎' : s.source === 'google_fit' ? '🤖' : '✏️'}
          </Text>
        </View>
      ))}

      {/* Bouton add manuel */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowLogModal(true)}>
        <CDMIcon name="plus" size={24} color="#000" />
      </TouchableOpacity>

      <SleepLogModal
        visible={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSaved={async () => { setShowLogModal(false); await load(); }}
      />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal de saisie manuelle
// ═══════════════════════════════════════════════════════════════════════════

function SleepLogModal({
  visible, onClose, onSaved,
}: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [bedtime, setBedtime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(23, 0, 0, 0);
    return d;
  });
  const [wakeTime, setWakeTime] = useState(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [hrv, setHrv] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showBed, setShowBed] = useState(false);
  const [showWake, setShowWake] = useState(false);

  const save = async () => {
    if (wakeTime <= bedtime) {
      Alert.alert('⚠️', 'Wake time must be after bedtime');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sleep_date = wakeTime.toISOString().slice(0, 10);

      const payload: any = {
        user_id: user.id,
        sleep_date,
        bedtime: bedtime.toISOString(),
        wake_time: wakeTime.toISOString(),
        quality,
        source: 'manual',
        notes: notes || null,
        hrv_rmssd_ms: hrv ? parseFloat(hrv) : null,
      };

      const { error } = await supabase
        .from('sleep_sessions')
        .upsert(payload, { onConflict: 'user_id,sleep_date' });

      if (error) {
        Alert.alert('Erreur', error.message);
      } else {
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>{t('recovery.sleep.log_night')}</Text>

          <TouchableOpacity style={modalStyles.field} onPress={() => setShowBed(true)}>
            <Text style={modalStyles.label}>{t('recovery.sleep.bedtime')}</Text>
            <Text style={modalStyles.value}>
              {bedtime.toLocaleString('fr-BE', {
                weekday: 'short', day: '2-digit', month: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
          {showBed && (
            <DateTimePicker
              value={bedtime}
              mode="datetime"
              display="default"
              onChange={(_, d) => { setShowBed(Platform.OS === 'ios'); if (d) setBedtime(d); }}
            />
          )}

          <TouchableOpacity style={modalStyles.field} onPress={() => setShowWake(true)}>
            <Text style={modalStyles.label}>{t('recovery.sleep.wake_time')}</Text>
            <Text style={modalStyles.value}>
              {wakeTime.toLocaleString('fr-BE', {
                weekday: 'short', day: '2-digit', month: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
          {showWake && (
            <DateTimePicker
              value={wakeTime}
              mode="datetime"
              display="default"
              onChange={(_, d) => { setShowWake(Platform.OS === 'ios'); if (d) setWakeTime(d); }}
            />
          )}

          {/* Quality */}
          <Text style={modalStyles.label}>{t('recovery.sleep.quality')}</Text>
          <View style={modalStyles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setQuality(n as any)}>
                <Text style={[modalStyles.star, n <= quality && modalStyles.starOn]}>
                  {n <= quality ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* HRV (optionnel) */}
          <Text style={modalStyles.label}>{t('recovery.sleep.hrv')} (optional)</Text>
          <TextInput
            value={hrv}
            onChangeText={setHrv}
            keyboardType="numeric"
            placeholder="42"
            placeholderTextColor={theme.muted}
            style={modalStyles.input}
          />

          {/* Notes */}
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('recovery.sleep.notes_placeholder')}
            placeholderTextColor={theme.muted}
            style={[modalStyles.input, { height: 60 }]}
            multiline
          />

          <View style={modalStyles.actions}>
            <TouchableOpacity onPress={onClose} style={[modalStyles.btn, modalStyles.btnSecondary]}>
              <Text style={{ color: theme.text }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={save}
              disabled={saving}
              style={[modalStyles.btn, modalStyles.btnPrimary]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={{ color: '#000', fontWeight: '700' }}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 100 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: theme.gold, fontSize: 28, fontWeight: '900' },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: theme.gold + '66',
  },
  syncBtnText: { color: theme.gold, fontSize: 12, fontWeight: '600' },
  lastSync: { color: theme.muted, fontSize: 11, marginBottom: 12 },

  lastNightCard: {
    backgroundColor: theme.surface, borderRadius: 16, padding: 20,
    marginBottom: 12, borderWidth: 1, borderColor: theme.gold + '33',
  },
  cardLabel: { color: theme.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  bigDuration: { color: theme.text, fontSize: 48, fontWeight: '900', marginVertical: 8 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaItem: {},
  metaLabel: { color: theme.muted, fontSize: 11 },
  metaValue: { color: theme.text, fontSize: 14, fontWeight: '600' },

  phasesRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  phaseChip: {
    backgroundColor: theme.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: theme.muted + '33',
  },
  phaseLabel: { color: theme.muted, fontSize: 10 },
  phaseValue: { color: theme.text, fontSize: 13, fontWeight: '600' },

  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.gold, paddingVertical: 12, borderRadius: 12, marginTop: 8,
    gap: 8,
  },
  logBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },

  avgCard: {
    backgroundColor: theme.surface, borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: theme.muted + '22',
  },
  avgValue: { color: theme.gold, fontSize: 32, fontWeight: '900', marginVertical: 4 },

  sectionTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  histRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  histDate: { color: theme.muted, fontSize: 11, width: 80 },
  histBarBg: { flex: 1, height: 8, backgroundColor: theme.muted + '22', borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  histBarFill: { height: 8, borderRadius: 4 },
  histValue: { color: theme.text, fontSize: 12, fontWeight: '600', width: 60, textAlign: 'right' },
  histSource: { fontSize: 14, marginLeft: 8 },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.gold, justifyContent: 'center', alignItems: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
  },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
  },
  handle: { width: 40, height: 4, backgroundColor: theme.muted, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { color: theme.gold, fontSize: 20, fontWeight: '900', marginBottom: 16 },
  field: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.muted + '22' },
  label: { color: theme.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  value: { color: theme.text, fontSize: 16, fontWeight: '600' },
  starsRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  star: { fontSize: 32, color: theme.muted + '66' },
  starOn: { color: theme.gold },
  input: {
    backgroundColor: theme.bg, borderRadius: 8, padding: 12, color: theme.text,
    fontSize: 14, marginVertical: 8, borderWidth: 1, borderColor: theme.muted + '22',
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnSecondary: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.muted + '33' },
  btnPrimary: { backgroundColor: theme.gold },
});
