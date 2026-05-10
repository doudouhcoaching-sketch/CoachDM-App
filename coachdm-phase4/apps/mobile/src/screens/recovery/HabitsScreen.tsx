// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Mobile · HabitsScreen
// ═══════════════════════════════════════════════════════════════════════════
// Liste des habitudes du jour, marquage one-tap, création/édition/archivage
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { habitsForToday, habitCompletionRate } from '@coachdm/shared/recovery';
import type { Habit, HabitCategory, HabitInput, HabitLog } from '@coachdm/shared/recovery';

type Props = NativeStackScreenProps<any, 'Habits'>;

const CATEGORIES: { key: HabitCategory; icon: string; color: string }[] = [
  { key: 'meditation',    icon: 'moon',     color: '#A78BFA' },
  { key: 'stretching',    icon: 'activity', color: '#10B981' },
  { key: 'mobility',      icon: 'wind',     color: '#38BDF8' },
  { key: 'journaling',    icon: 'edit-3',   color: '#D4AF37' },
  { key: 'breathwork',    icon: 'wind',     color: '#A78BFA' },
  { key: 'cold_exposure', icon: 'snowflake',color: '#38BDF8' },
  { key: 'sauna',         icon: 'flame',    color: '#EF4444' },
  { key: 'reading',       icon: 'book',     color: '#D4AF37' },
  { key: 'walking',       icon: 'navigation',color: '#10B981' },
  { key: 'custom',        icon: 'star',     color: '#D4AF37' },
];

export function HabitsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logsToday, setLogsToday] = useState<HabitLog[]>([]);
  const [logs7d, setLogs7d] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sevenAgo = new Date();
    sevenAgo.setDate(sevenAgo.getDate() - 7);
    const sevenAgoStr = sevenAgo.toISOString().slice(0, 10);

    const [habitsRes, logsTodayRes, logs7dRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false)
        .order('display_order'),
      supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('log_date', today),
      supabase.from('habit_logs').select('*').eq('user_id', user.id)
        .gte('log_date', sevenAgoStr),
    ]);

    setHabits(habitsRes.data ?? []);
    setLogsToday(logsTodayRes.data ?? []);
    setLogs7d(logs7dRes.data ?? []);
    setLoading(false);
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const todaysHabits = habitsForToday(habits);
  const doneSet = useMemo(() => new Set(logsToday.map((l) => l.habit_id)), [logsToday]);

  const toggleHabit = async (habit: Habit) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (doneSet.has(habit.id)) {
      // Annuler
      const log = logsToday.find((l) => l.habit_id === habit.id);
      if (log) {
        const { error } = await supabase.from('habit_logs').delete().eq('id', log.id);
        if (!error) load();
      }
    } else {
      // Marquer fait
      const { error } = await supabase.from('habit_logs').insert({
        habit_id: habit.id,
        user_id: user.id,
        log_date: today,
        done_at: new Date().toISOString(),
      });
      if (error) Alert.alert('Erreur', error.message);
      else load();
    }
  };

  const archiveHabit = async (habit: Habit) => {
    Alert.alert(
      habit.archived ? t('recovery.habits.unarchive') : t('recovery.habits.archive'),
      '',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            await supabase.from('habits').update({ archived: !habit.archived }).eq('id', habit.id);
            load();
          },
        },
      ]
    );
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
      <View style={styles.header}>
        <Text style={styles.title}>{t('recovery.habits.title')}</Text>
        <TouchableOpacity onPress={() => { setEditing(null); setShowEditor(true); }} style={styles.addBtn}>
          <CDMIcon name="plus" size={16} color="#000" />
          <Text style={styles.addBtnText}>{t('recovery.habits.new')}</Text>
        </TouchableOpacity>
      </View>

      {/* Today's habits */}
      <Text style={styles.sectionTitle}>{today}</Text>
      {todaysHabits.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t('recovery.habits.no_habits')}</Text>
        </View>
      ) : (
        todaysHabits.map((h) => {
          const done = doneSet.has(h.id);
          const cat = CATEGORIES.find((c) => c.key === h.category) || CATEGORIES[CATEGORIES.length - 1];
          const label = h.category === 'custom'
            ? (h.name || '—')
            : t(`recovery.habits.categories.${h.category}` as any);
          const rate = Math.round(habitCompletionRate(h, logs7d, 7) * 100);

          return (
            <TouchableOpacity
              key={h.id}
              style={[styles.habitRow, done && styles.habitRowDone]}
              onPress={() => toggleHabit(h)}
              onLongPress={() => { setEditing(h); setShowEditor(true); }}
              activeOpacity={0.85}
            >
              <View style={[styles.habitIcon, { backgroundColor: '#' + (h.color || cat.color.slice(1)) + '22' }]}>
                <CDMIcon name={h.icon || cat.icon} size={20} color={'#' + (h.color || cat.color.slice(1))} />
              </View>
              <View style={styles.habitMain}>
                <Text style={[styles.habitName, done && styles.habitNameDone]}>{label}</Text>
                <Text style={styles.habitMeta}>
                  {h.target_minutes ? `${h.target_minutes} min · ` : ''}
                  {rate}% {t('recovery.habits.completion_rate').toLowerCase()} (7j)
                </Text>
              </View>
              <View style={[styles.checkbox, done && styles.checkboxDone]}>
                {done && <CDMIcon name="check" size={18} color="#000" />}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* All habits (incl. inactive today) */}
      {habits.length > todaysHabits.length && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Toutes les habitudes</Text>
          {habits.filter((h) => !todaysHabits.includes(h)).map((h) => {
            const cat = CATEGORIES.find((c) => c.key === h.category) || CATEGORIES[CATEGORIES.length - 1];
            const label = h.category === 'custom'
              ? (h.name || '—')
              : t(`recovery.habits.categories.${h.category}` as any);
            return (
              <TouchableOpacity
                key={h.id}
                style={[styles.habitRow, { opacity: 0.5 }]}
                onPress={() => { setEditing(h); setShowEditor(true); }}
              >
                <View style={[styles.habitIcon, { backgroundColor: '#' + (h.color || cat.color.slice(1)) + '22' }]}>
                  <CDMIcon name={h.icon || cat.icon} size={20} color={'#' + (h.color || cat.color.slice(1))} />
                </View>
                <View style={styles.habitMain}>
                  <Text style={styles.habitName}>{label}</Text>
                  <Text style={styles.habitMeta}>Pas active aujourd'hui</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      <HabitEditorModal
        visible={showEditor}
        habit={editing}
        onClose={() => setShowEditor(false)}
        onSaved={() => { setShowEditor(false); load(); }}
        onArchive={archiveHabit}
      />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Editor modal
// ═══════════════════════════════════════════════════════════════════════════

function HabitEditorModal({
  visible, habit, onClose, onSaved, onArchive,
}: {
  visible: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSaved: () => void;
  onArchive: (h: Habit) => void;
}) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<HabitCategory>('meditation');
  const [name, setName] = useState('');
  const [targetMin, setTargetMin] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (habit) {
      setCategory(habit.category);
      setName(habit.name ?? '');
      setTargetMin(habit.target_minutes?.toString() ?? '');
      setReminderTime(habit.reminder_time?.slice(0, 5) ?? '');
      setReminderEnabled(habit.reminder_enabled);
      setActiveDays(habit.active_days ?? [1, 2, 3, 4, 5, 6, 7]);
    } else {
      setCategory('meditation');
      setName('');
      setTargetMin('');
      setReminderTime('');
      setReminderEnabled(false);
      setActiveDays([1, 2, 3, 4, 5, 6, 7]);
    }
  }, [habit, visible]);

  const toggleDay = (d: number) => {
    setActiveDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  };

  const save = async () => {
    if (category === 'custom' && !name.trim()) {
      Alert.alert('⚠️', 'Nom requis pour catégorie custom');
      return;
    }
    if (activeDays.length === 0) {
      Alert.alert('⚠️', 'Au moins un jour actif');
      return;
    }
    if (reminderEnabled && reminderTime && !/^\d{2}:\d{2}$/.test(reminderTime)) {
      Alert.alert('⚠️', 'Format heure : HH:MM');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload: any = {
        user_id: user.id,
        category,
        name: name.trim() || null,
        target_minutes: targetMin ? parseInt(targetMin, 10) : null,
        reminder_time: reminderTime ? `${reminderTime}:00` : null,
        reminder_enabled: reminderEnabled,
        active_days: activeDays,
      };

      if (habit) {
        const { error } = await supabase.from('habits').update(payload).eq('id', habit.id);
        if (error) { Alert.alert('Erreur', error.message); return; }
      } else {
        const { error } = await supabase.from('habits').insert(payload);
        if (error) { Alert.alert('Erreur', error.message); return; }
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const days = t('recovery.habits.days_short') as unknown as string[];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <ScrollView style={modalStyles.sheetScroll} contentContainerStyle={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>
            {habit ? 'Modifier' : t('recovery.habits.new')}
          </Text>

          {/* Category */}
          <Text style={modalStyles.label}>Catégorie</Text>
          <View style={modalStyles.catGrid}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.key}
                onPress={() => setCategory(c.key)}
                style={[modalStyles.catChip, category === c.key && { borderColor: theme.gold, backgroundColor: theme.gold + '22' }]}
              >
                <CDMIcon name={c.icon} size={16} color={category === c.key ? theme.gold : theme.muted} />
                <Text style={[modalStyles.catLabel, category === c.key && { color: theme.gold }]}>
                  {t(`recovery.habits.categories.${c.key}` as any)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {category === 'custom' && (
            <>
              <Text style={modalStyles.label}>Nom</Text>
              <TextInput value={name} onChangeText={setName} style={modalStyles.input} />
            </>
          )}

          {/* Active days */}
          <Text style={modalStyles.label}>{t('recovery.habits.active_days')}</Text>
          <View style={modalStyles.daysRow}>
            {days.map((d, i) => {
              const dayNum = i + 1;
              const on = activeDays.includes(dayNum);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleDay(dayNum)}
                  style={[modalStyles.dayChip, on && modalStyles.dayChipOn]}
                >
                  <Text style={[modalStyles.dayLabel, on && { color: '#000' }]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Target minutes */}
          <Text style={modalStyles.label}>{t('recovery.habits.target_minutes')}</Text>
          <TextInput
            value={targetMin}
            onChangeText={setTargetMin}
            keyboardType="numeric"
            placeholder="optionnel"
            placeholderTextColor={theme.muted}
            style={modalStyles.input}
          />

          {/* Reminder */}
          <View style={modalStyles.row}>
            <Text style={[modalStyles.label, { flex: 1 }]}>Rappel</Text>
            <TouchableOpacity
              onPress={() => setReminderEnabled(!reminderEnabled)}
              style={[modalStyles.toggle, reminderEnabled && modalStyles.toggleOn]}
            >
              <View style={[modalStyles.toggleKnob, reminderEnabled && modalStyles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>
          {reminderEnabled && (
            <>
              <Text style={modalStyles.label}>{t('recovery.habits.reminder_time')} (HH:MM)</Text>
              <TextInput
                value={reminderTime}
                onChangeText={setReminderTime}
                placeholder="07:00"
                placeholderTextColor={theme.muted}
                style={modalStyles.input}
              />
            </>
          )}

          {/* Actions */}
          <View style={modalStyles.actions}>
            <TouchableOpacity onPress={onClose} style={[modalStyles.btn, modalStyles.btnSecondary]}>
              <Text style={{ color: theme.text }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} disabled={saving} style={[modalStyles.btn, modalStyles.btnPrimary]}>
              {saving ? <ActivityIndicator size="small" color="#000" /> : <Text style={{ color: '#000', fontWeight: '700' }}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>

          {habit && (
            <TouchableOpacity onPress={() => onArchive(habit)} style={modalStyles.archiveBtn}>
              <Text style={{ color: theme.red }}>
                {habit.archived ? t('recovery.habits.unarchive') : t('recovery.habits.archive')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
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
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.gold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  addBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  sectionTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  emptyCard: { backgroundColor: theme.surface, borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { color: theme.muted, fontSize: 14, textAlign: 'center' },

  habitRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: theme.muted + '22',
  },
  habitRowDone: { backgroundColor: theme.surface, borderColor: theme.green + '66' },
  habitIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  habitMain: { flex: 1 },
  habitName: { color: theme.text, fontSize: 15, fontWeight: '600' },
  habitNameDone: { textDecorationLine: 'line-through', color: theme.muted },
  habitMeta: { color: theme.muted, fontSize: 11, marginTop: 2 },
  checkbox: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: theme.muted,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxDone: { backgroundColor: theme.green, borderColor: theme.green },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheetScroll: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  sheet: { padding: 20, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: theme.muted, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { color: theme.gold, fontSize: 20, fontWeight: '900', marginBottom: 16 },
  label: { color: theme.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: theme.bg, borderRadius: 8, padding: 12, color: theme.text,
    fontSize: 14, borderWidth: 1, borderColor: theme.muted + '22',
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1, borderColor: theme.muted + '33',
  },
  catLabel: { color: theme.muted, fontSize: 11 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  dayChip: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.muted + '33',
  },
  dayChipOn: { backgroundColor: theme.gold, borderColor: theme.gold },
  dayLabel: { color: theme.muted, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: theme.muted + '44', padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: theme.gold },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleKnobOn: { transform: [{ translateX: 20 }] },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnSecondary: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.muted + '33' },
  btnPrimary: { backgroundColor: theme.gold },
  archiveBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
});
