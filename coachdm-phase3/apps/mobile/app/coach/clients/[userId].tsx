// apps/mobile/app/coach/clients/[userId].tsx
// ============================================================
// Coach DM · Mobile · Client detail (coach view)
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createCoachClient,
  createCheckInsClient,
  createMessagingClient,
  type CoachClient,
  type CheckInWithPhotos,
  type AssignedPlan,
  coachI18n,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { Colors } from '@/lib/theme';

export default function ClientDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const supabase = useSupabase();
  const { locale } = useLocale();
  const router = useRouter();
  const i = coachI18n.coachDash;

  const coach = useMemo(() => createCoachClient(supabase), [supabase]);
  const checkIns = useMemo(() => createCheckInsClient(supabase), [supabase]);
  const messaging = useMemo(() => createMessagingClient(supabase), [supabase]);

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<(CoachClient & any) | null>(null);
  const [history, setHistory] = useState<CheckInWithPhotos[]>([]);
  const [plans, setPlans] = useState<AssignedPlan[]>([]);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const load = async () => {
    if (!userId) return;
    const { data: assignmentData } = await supabase
      .from('coach_clients')
      .select(`*, client:profiles!coach_clients_client_user_id_fkey(full_name, email, avatar_url)`)
      .eq('client_user_id', userId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assignmentData) {
      setLoading(false);
      return;
    }

    setAssignment(assignmentData);
    setNotes(assignmentData.notes ?? '');

    const [historyData, plansData] = await Promise.all([
      checkIns.getHistoryForClient(userId),
      coach.listClientPlans(userId),
    ]);
    setHistory(historyData);
    setPlans(plansData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const saveNotes = async () => {
    if (!assignment) return;
    await coach.updateClientNotes(assignment.id, notes);
    setEditingNotes(false);
  };

  const updateStatus = async (status: 'active' | 'paused' | 'archived') => {
    if (!assignment) return;
    await coach.updateClientStatus(assignment.id, status);
    await load();
  };

  const openThread = async () => {
    if (!assignment) return;
    const { data: thread } = await supabase
      .from('message_threads')
      .select('id')
      .eq('client_user_id', assignment.client_user_id)
      .eq('coach_user_id', assignment.coach_user_id)
      .maybeSingle();
    if (thread?.id) router.push(`/messages/${thread.id}`);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.loading}>
        <Text style={styles.emptyText}>
          {locale === 'fr' ? 'Client introuvable' : 'Client not found'}
        </Text>
      </View>
    );
  }

  const lastCheckIn = history[0];
  const activePlan = plans.find((p) => p.status === 'active');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.gold,
          headerTitle: '',
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {(assignment.client?.full_name ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{assignment.client?.full_name}</Text>
        <Text style={styles.email}>{assignment.client?.email}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {assignment.status === 'active'
              ? locale === 'fr'
                ? 'Actif'
                : 'Active'
              : assignment.status === 'paused'
                ? locale === 'fr'
                  ? 'En pause'
                  : 'Paused'
                : locale === 'fr'
                  ? 'Archivé'
                  : 'Archived'}
          </Text>
        </View>
      </View>

      {/* ── Quick actions ────────────────────────────────────── */}
      <View style={styles.quickRow}>
        <Pressable
          onPress={openThread}
          style={({ pressed }) => [
            styles.quickBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="chatbubble-outline" size={20} color={Colors.gold} />
          <Text style={styles.quickBtnText}>
            {locale === 'fr' ? 'Message' : 'Message'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setShowAssignModal(true)}
          style={({ pressed }) => [
            styles.quickBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.gold} />
          <Text style={styles.quickBtnText}>{i.assign_program[locale]}</Text>
        </Pressable>
      </View>

      {/* ── Active plan ──────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {coachI18n.plans.active_plan[locale]}
        </Text>
        {activePlan ? (
          <Pressable
            onPress={() => router.push(`/coach/plans/${activePlan.id}`)}
            style={({ pressed }) => [
              styles.planRow,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>
                {locale === 'fr'
                  ? activePlan.title_fr
                  : locale === 'en'
                    ? activePlan.title_en
                    : activePlan.title_nl}
              </Text>
              <Text style={styles.planMeta}>
                {activePlan.duration_weeks}{' '}
                {coachI18n.plans.duration_weeks[locale]} ·{' '}
                {new Date(activePlan.start_date).toLocaleDateString(locale)} →{' '}
                {new Date(activePlan.end_date).toLocaleDateString(locale)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
          </Pressable>
        ) : (
          <Text style={styles.emptySection}>
            {coachI18n.plans.no_active_plan[locale]}
          </Text>
        )}
      </View>

      {/* ── Last check-in ────────────────────────────────────── */}
      {lastCheckIn && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {locale === 'fr'
              ? 'Dernier check-in'
              : locale === 'en'
                ? 'Latest check-in'
                : 'Laatste check-in'}
          </Text>
          <Pressable
            onPress={() => router.push(`/coach/checkins/${lastCheckIn.id}`)}
            style={({ pressed }) => [
              styles.checkInRow,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.checkInDate}>
                {new Date(lastCheckIn.week_start_date).toLocaleDateString(
                  locale
                )}
              </Text>
              <View style={styles.checkInStats}>
                {lastCheckIn.weight_kg && (
                  <StatPill
                    label={coachI18n.checkIns.weight[locale].split(' ')[0]}
                    value={`${lastCheckIn.weight_kg}kg`}
                  />
                )}
                {lastCheckIn.energy_level && (
                  <StatPill
                    label={coachI18n.checkIns.energy[locale]}
                    value={`${lastCheckIn.energy_level}/5`}
                  />
                )}
                {lastCheckIn.workouts_completed !== null && (
                  <StatPill
                    label="🏋️"
                    value={`${lastCheckIn.workouts_completed}/${lastCheckIn.workouts_planned ?? '—'}`}
                  />
                )}
              </View>
              <View
                style={[
                  styles.statusPill,
                  lastCheckIn.status === 'reviewed' && styles.statusPillDone,
                  lastCheckIn.status === 'submitted' && styles.statusPillNew,
                ]}
              >
                <Text style={styles.statusPillText}>
                  {lastCheckIn.status === 'reviewed'
                    ? '✓ ' + (locale === 'fr' ? 'Examiné' : 'Reviewed')
                    : lastCheckIn.status === 'submitted'
                      ? '● ' + (locale === 'fr' ? 'À examiner' : 'To review')
                      : (locale === 'fr' ? 'En attente' : 'Pending')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
          </Pressable>
        </View>
      )}

      {/* ── Check-in history ─────────────────────────────────── */}
      {history.length > 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {coachI18n.checkIns.history[locale]} ({history.length})
          </Text>
          {history.slice(1, 6).map((ci) => (
            <Pressable
              key={ci.id}
              onPress={() => router.push(`/coach/checkins/${ci.id}`)}
              style={({ pressed }) => [
                styles.historyRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.historyDate}>
                {new Date(ci.week_start_date).toLocaleDateString(locale)}
              </Text>
              {ci.weight_kg && (
                <Text style={styles.historyWeight}>{ci.weight_kg}kg</Text>
              )}
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.textDim}
              />
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Coach private notes ──────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>
            {locale === 'fr'
              ? 'Notes privées (coach)'
              : locale === 'en'
                ? 'Private notes (coach)'
                : 'Privé notities (coach)'}
          </Text>
          <Pressable onPress={() => setEditingNotes((e) => !e)}>
            <Text style={styles.linkText}>
              {editingNotes
                ? locale === 'fr'
                  ? 'Annuler'
                  : 'Cancel'
                : locale === 'fr'
                  ? 'Modifier'
                  : 'Edit'}
            </Text>
          </Pressable>
        </View>
        {editingNotes ? (
          <>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder={
                locale === 'fr'
                  ? 'Notes invisibles au client…'
                  : 'Notes hidden from client…'
              }
              placeholderTextColor={Colors.textDim}
              style={styles.notesInput}
            />
            <Pressable
              onPress={saveNotes}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.saveBtnText}>
                {locale === 'fr' ? 'Enregistrer' : 'Save'}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.notesView}>
            {notes ||
              (locale === 'fr'
                ? 'Aucune note'
                : locale === 'en'
                  ? 'No notes'
                  : 'Geen notities')}
          </Text>
        )}
      </View>

      {/* ── Status actions ───────────────────────────────────── */}
      <View style={styles.dangerZone}>
        {assignment.status === 'active' && (
          <Pressable
            onPress={() =>
              Alert.alert(
                i.pause[locale],
                locale === 'fr' ? 'Confirmer ?' : 'Confirm?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'OK', onPress: () => updateStatus('paused') },
                ]
              )
            }
            style={({ pressed }) => [
              styles.dangerBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.dangerBtnText}>{i.pause[locale]}</Text>
          </Pressable>
        )}
        {assignment.status === 'paused' && (
          <Pressable
            onPress={() => updateStatus('active')}
            style={({ pressed }) => [
              styles.dangerBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.dangerBtnText}>{i.resume[locale]}</Text>
          </Pressable>
        )}
        {assignment.status !== 'archived' && (
          <Pressable
            onPress={() =>
              Alert.alert(
                i.archive[locale],
                locale === 'fr'
                  ? 'Cette action arrête la collaboration. Continuer ?'
                  : 'This ends the collaboration. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'OK',
                    style: 'destructive',
                    onPress: () => updateStatus('archived'),
                  },
                ]
              )
            }
            style={({ pressed }) => [
              styles.dangerBtn,
              styles.dangerBtnDestructive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.dangerBtnText,
                { color: '#ff6b6b' },
              ]}
            >
              {i.archive[locale]}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* ── Assign program modal ─────────────────────────────── */}
      <AssignProgramModal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        clientUserId={assignment.client_user_id}
        onAssigned={() => {
          setShowAssignModal(false);
          load();
        }}
      />
    </ScrollView>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

function AssignProgramModal({
  visible,
  onClose,
  clientUserId,
  onAssigned,
}: {
  visible: boolean;
  onClose: () => void;
  clientUserId: string;
  onAssigned: () => void;
}) {
  const supabase = useSupabase();
  const { locale } = useLocale();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const coach = useMemo(() => createCoachClient(supabase), [supabase]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    supabase
      .from('programs')
      .select('id, title_fr, title_en, title_nl, duration_weeks, goal')
      .order('title_fr')
      .then(({ data }) => {
        setPrograms(data ?? []);
        setLoading(false);
      });
  }, [visible]);

  const assign = async (programId: string) => {
    setAssigning(programId);
    try {
      await coach.assignProgramToClient(clientUserId, programId);
      onAssigned();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={28} color={Colors.gold} />
          </Pressable>
          <Text style={styles.modalTitle}>
            {coachI18n.coachDash.assign_program[locale]}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.gold} />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {programs.map((p) => {
              const title =
                locale === 'fr'
                  ? p.title_fr
                  : locale === 'en'
                    ? p.title_en
                    : p.title_nl;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => assign(p.id)}
                  disabled={assigning === p.id}
                  style={({ pressed }) => [
                    styles.programItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.programTitle}>{title}</Text>
                    <Text style={styles.programMeta}>
                      {p.duration_weeks}{' '}
                      {coachI18n.plans.duration_weeks[locale]} · {p.goal}
                    </Text>
                  </View>
                  {assigning === p.id ? (
                    <ActivityIndicator color={Colors.gold} />
                  ) : (
                    <Ionicons
                      name="add-circle"
                      size={24}
                      color={Colors.gold}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { color: Colors.textDim, fontSize: 16 },
  hero: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLetter: { color: Colors.background, fontSize: 36, fontWeight: '700' },
  name: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  email: { color: Colors.textDim, fontSize: 13, marginTop: 2 },
  statusBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  statusText: { color: Colors.gold, fontSize: 11, fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBtnText: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  linkText: { color: Colors.gold, fontSize: 13, fontWeight: '600' },
  emptySection: { color: Colors.textDim, fontSize: 13, paddingVertical: 8 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
  },
  planTitle: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  planMeta: { color: Colors.textDim, fontSize: 12, marginTop: 3 },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
  },
  checkInDate: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  checkInStats: { flexDirection: 'row', gap: 6, marginTop: 6 },
  statPill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
  },
  statPillLabel: { color: Colors.textDim, fontSize: 11 },
  statPillValue: { color: Colors.gold, fontSize: 11, fontWeight: '700' },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  statusPillDone: { backgroundColor: 'rgba(76, 175, 80, 0.15)' },
  statusPillNew: { backgroundColor: 'rgba(255, 193, 7, 0.18)' },
  statusPillText: { color: Colors.text, fontSize: 11, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  historyDate: { flex: 1, color: Colors.text, fontSize: 13 },
  historyWeight: { color: Colors.textDim, fontSize: 13 },
  notesInput: {
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  notesView: { color: Colors.text, fontSize: 14, lineHeight: 21 },
  saveBtn: {
    backgroundColor: Colors.gold,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: { color: Colors.background, fontSize: 14, fontWeight: '700' },
  dangerZone: { gap: 8, marginTop: 16 },
  dangerBtn: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  dangerBtnDestructive: { borderWidth: 1, borderColor: '#ff6b6b' },
  dangerBtnText: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  modalTitle: { color: Colors.gold, fontSize: 17, fontWeight: '700' },
  programItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  programTitle: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  programMeta: { color: Colors.textDim, fontSize: 12, marginTop: 3 },
});
