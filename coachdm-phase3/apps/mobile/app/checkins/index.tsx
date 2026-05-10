// apps/mobile/app/checkins/index.tsx
// ============================================================
// Coach DM · Mobile · Weekly check-in form
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  createCheckInsClient,
  type CheckIn,
  type CheckInWithPhotos,
  coachI18n,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { Colors } from '@/lib/theme';

type Pose = 'front' | 'side' | 'back';

export default function CheckInScreen() {
  const supabase = useSupabase();
  const { user } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();
  const i = coachI18n.checkIns;

  const checkIns = useMemo(() => createCheckInsClient(supabase), [supabase]);

  const [current, setCurrent] = useState<CheckInWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Local form state (mirrors check_ins columns)
  const [form, setForm] = useState<Partial<CheckIn>>({});

  useEffect(() => {
    (async () => {
      const cur = await checkIns.getCurrentForClient();
      setCurrent(cur);
      if (cur) {
        setForm({
          weight_kg: cur.weight_kg,
          body_fat_pct: cur.body_fat_pct,
          waist_cm: cur.waist_cm,
          hips_cm: cur.hips_cm,
          chest_cm: cur.chest_cm,
          arm_cm: cur.arm_cm,
          thigh_cm: cur.thigh_cm,
          energy_level: cur.energy_level,
          sleep_quality: cur.sleep_quality,
          stress_level: cur.stress_level,
          motivation_level: cur.motivation_level,
          hunger_level: cur.hunger_level,
          soreness_level: cur.soreness_level,
          workouts_completed: cur.workouts_completed,
          workouts_planned: cur.workouts_planned,
          nutrition_adherence_pct: cur.nutrition_adherence_pct,
          client_notes: cur.client_notes,
          client_wins: cur.client_wins,
          client_struggles: cur.client_struggles,
        });
      }
      setLoading(false);
    })();
  }, []);

  const isReadonly =
    !current || current.status === 'submitted' || current.status === 'reviewed';

  const setField = <K extends keyof CheckIn>(k: K, v: CheckIn[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const saveDraft = async () => {
    if (!current || saving || isReadonly) return;
    setSaving(true);
    try {
      await checkIns.updateMetrics(current.id, form);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!current || isReadonly) return;
    setSubmitting(true);
    try {
      await checkIns.updateMetrics(current.id, form);
      await checkIns.submit(current.id);
      Alert.alert('✓', i.submitted[locale]);
      const refreshed = await checkIns.getCurrentForClient();
      setCurrent(refreshed);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addPhoto = async (pose: Pose) => {
    if (!current || !user || isReadonly) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const blob = await (await fetch(asset.uri)).blob();
    const filename = asset.fileName ?? `${pose}-${Date.now()}.jpg`;
    await checkIns.uploadPhoto(current.id, blob, pose, filename, user.id);
    const refreshed = await checkIns.getCurrentForClient();
    setCurrent(refreshed);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.loading}>
        <Ionicons name="calendar-clear-outline" size={64} color={Colors.textDim} />
        <Text style={styles.emptyText}>
          {locale === 'fr'
            ? 'Aucun check-in disponible'
            : locale === 'en'
              ? 'No check-in available'
              : 'Geen check-in beschikbaar'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{i.weekly_check_in[locale]}</Text>
      <Text style={styles.subtitle}>
        {i.history[locale].toLowerCase() === 'historique' ? 'Semaine du' :
          locale === 'en' ? 'Week of' : 'Week van'}{' '}
        {new Date(current.week_start_date).toLocaleDateString(locale)}
      </Text>

      {current.status === 'reviewed' && current.coach_feedback && (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>{i.coach_feedback[locale]}</Text>
          <Text style={styles.feedbackText}>{current.coach_feedback}</Text>
          {current.coach_action_items && (
            <>
              <Text style={[styles.feedbackTitle, { marginTop: 12 }]}>
                {i.coach_action_items[locale]}
              </Text>
              <Text style={styles.feedbackText}>
                {current.coach_action_items}
              </Text>
            </>
          )}
        </View>
      )}

      {/* ── Body metrics ─────────────────────────────────────── */}
      <Section title={i.section_metrics[locale]}>
        <NumberRow
          label={i.weight[locale]}
          value={form.weight_kg}
          onChange={(v) => setField('weight_kg', v)}
          editable={!isReadonly}
          step={0.1}
        />
        <NumberRow
          label={i.body_fat[locale]}
          value={form.body_fat_pct}
          onChange={(v) => setField('body_fat_pct', v)}
          editable={!isReadonly}
          step={0.1}
        />
        <NumberRow
          label={i.waist[locale]}
          value={form.waist_cm}
          onChange={(v) => setField('waist_cm', v)}
          editable={!isReadonly}
          step={0.5}
        />
        <NumberRow
          label={i.hips[locale]}
          value={form.hips_cm}
          onChange={(v) => setField('hips_cm', v)}
          editable={!isReadonly}
          step={0.5}
        />
        <NumberRow
          label={i.chest[locale]}
          value={form.chest_cm}
          onChange={(v) => setField('chest_cm', v)}
          editable={!isReadonly}
          step={0.5}
        />
        <NumberRow
          label={i.arm[locale]}
          value={form.arm_cm}
          onChange={(v) => setField('arm_cm', v)}
          editable={!isReadonly}
          step={0.5}
        />
        <NumberRow
          label={i.thigh[locale]}
          value={form.thigh_cm}
          onChange={(v) => setField('thigh_cm', v)}
          editable={!isReadonly}
          step={0.5}
        />
      </Section>

      {/* ── Feelings ─────────────────────────────────────────── */}
      <Section title={i.section_feelings[locale]}>
        <ScaleRow
          label={i.energy[locale]}
          value={form.energy_level}
          onChange={(v) => setField('energy_level', v)}
          editable={!isReadonly}
        />
        <ScaleRow
          label={i.sleep[locale]}
          value={form.sleep_quality}
          onChange={(v) => setField('sleep_quality', v)}
          editable={!isReadonly}
        />
        <ScaleRow
          label={i.stress[locale]}
          value={form.stress_level}
          onChange={(v) => setField('stress_level', v)}
          editable={!isReadonly}
        />
        <ScaleRow
          label={i.motivation[locale]}
          value={form.motivation_level}
          onChange={(v) => setField('motivation_level', v)}
          editable={!isReadonly}
        />
        <ScaleRow
          label={i.hunger[locale]}
          value={form.hunger_level}
          onChange={(v) => setField('hunger_level', v)}
          editable={!isReadonly}
        />
        <ScaleRow
          label={i.soreness[locale]}
          value={form.soreness_level}
          onChange={(v) => setField('soreness_level', v)}
          editable={!isReadonly}
        />
      </Section>

      {/* ── Adherence ────────────────────────────────────────── */}
      <Section title={i.section_adherence[locale]}>
        <NumberRow
          label={i.workouts_completed[locale]}
          value={form.workouts_completed}
          onChange={(v) => setField('workouts_completed', v)}
          editable={!isReadonly}
          step={1}
          integer
        />
        <NumberRow
          label={i.nutrition_adherence[locale]}
          value={form.nutrition_adherence_pct}
          onChange={(v) => setField('nutrition_adherence_pct', v)}
          editable={!isReadonly}
          step={5}
          integer
        />
      </Section>

      {/* ── Photos ───────────────────────────────────────────── */}
      <Section title={i.section_photos[locale]}>
        <View style={styles.photoGrid}>
          {(['front', 'side', 'back'] as Pose[]).map((pose) => {
            const photo = current.photos?.find((p) => p.pose === pose);
            return (
              <View key={pose} style={styles.photoSlot}>
                <Pressable
                  onPress={() => !isReadonly && addPhoto(pose)}
                  style={styles.photoTouch}
                >
                  {photo ? (
                    <PhotoPreview path={photo.storage_path} />
                  ) : (
                    <View style={styles.photoEmpty}>
                      <Ionicons
                        name="camera-outline"
                        size={28}
                        color={Colors.gold}
                      />
                    </View>
                  )}
                </Pressable>
                <Text style={styles.photoLabel}>
                  {i[`pose_${pose}` as 'pose_front'][locale]}
                </Text>
              </View>
            );
          })}
        </View>
      </Section>

      {/* ── Notes ────────────────────────────────────────────── */}
      <Section title={i.section_notes[locale]}>
        <TextArea
          label={i.wins[locale]}
          value={form.client_wins ?? ''}
          onChange={(v) => setField('client_wins', v)}
          editable={!isReadonly}
        />
        <TextArea
          label={i.struggles[locale]}
          value={form.client_struggles ?? ''}
          onChange={(v) => setField('client_struggles', v)}
          editable={!isReadonly}
        />
        <TextArea
          label={i.free_notes[locale]}
          value={form.client_notes ?? ''}
          onChange={(v) => setField('client_notes', v)}
          editable={!isReadonly}
        />
      </Section>

      {/* ── Actions ──────────────────────────────────────────── */}
      {!isReadonly && (
        <View style={styles.actions}>
          <Pressable
            onPress={saveDraft}
            disabled={saving}
            style={({ pressed }) => [
              styles.btnSecondary,
              pressed && { opacity: 0.7 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={Colors.gold} />
            ) : (
              <Text style={styles.btnSecondaryText}>
                {locale === 'fr' ? 'Enregistrer' : locale === 'en' ? 'Save draft' : 'Concept opslaan'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={submit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && { opacity: 0.85 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.btnPrimaryText}>{i.submit[locale]}</Text>
            )}
          </Pressable>
        </View>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function NumberRow({
  label,
  value,
  onChange,
  editable,
  step = 0.1,
  integer = false,
}: {
  label: string;
  value?: number | null;
  onChange: (v: number | null) => void;
  editable: boolean;
  step?: number;
  integer?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        value={value !== null && value !== undefined ? String(value) : ''}
        onChangeText={(t) => {
          if (t === '') return onChange(null);
          const n = integer ? parseInt(t, 10) : parseFloat(t.replace(',', '.'));
          if (!isNaN(n)) onChange(n);
        }}
        keyboardType="decimal-pad"
        editable={editable}
        style={[styles.rowInput, !editable && styles.rowInputReadonly]}
        placeholder="—"
        placeholderTextColor={Colors.textDim}
      />
    </View>
  );
}

function ScaleRow({
  label,
  value,
  onChange,
  editable,
}: {
  label: string;
  value?: number | null;
  onChange: (v: number) => void;
  editable: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.scale}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => editable && onChange(n)}
            style={[
              styles.scaleDot,
              value === n && styles.scaleDotActive,
              !editable && styles.scaleDotReadonly,
            ]}
          >
            <Text
              style={[
                styles.scaleDotText,
                value === n && styles.scaleDotTextActive,
              ]}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TextArea({
  label,
  value,
  onChange,
  editable,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
}) {
  return (
    <View style={styles.areaWrap}>
      <Text style={styles.areaLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline
        editable={editable}
        placeholderTextColor={Colors.textDim}
        style={[styles.area, !editable && styles.rowInputReadonly]}
      />
    </View>
  );
}

function PhotoPreview({ path }: { path: string }) {
  const supabase = useSupabase();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage
      .from('check-in-photos')
      .createSignedUrl(path, 3600)
      .then(({ data }) => data && setUrl(data.signedUrl));
  }, [path]);
  if (!url) return <View style={styles.photoEmpty} />;
  return <Image source={url} style={styles.photoImg} contentFit="cover" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: { color: Colors.textDim, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.gold },
  subtitle: { fontSize: 14, color: Colors.textDim, marginTop: 4, marginBottom: 24 },
  feedbackCard: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.gold,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  feedbackTitle: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  feedbackText: { color: Colors.text, fontSize: 14, lineHeight: 21 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gold,
    marginBottom: 12,
  },
  sectionBody: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: { color: Colors.text, fontSize: 14, flex: 1 },
  rowInput: {
    color: Colors.text,
    fontSize: 14,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    textAlign: 'right',
  },
  rowInputReadonly: { opacity: 0.5 },
  scale: { flexDirection: 'row', gap: 6 },
  scaleDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scaleDotActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  scaleDotReadonly: { opacity: 0.5 },
  scaleDotText: { color: Colors.textDim, fontSize: 13, fontWeight: '600' },
  scaleDotTextActive: { color: Colors.background },
  areaWrap: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  areaLabel: { color: Colors.textDim, fontSize: 13, marginBottom: 6 },
  area: {
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  photoSlot: { flex: 1 },
  photoTouch: {
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  photoEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: 12,
  },
  photoImg: { width: '100%', height: '100%' },
  photoLabel: {
    textAlign: 'center',
    color: Colors.textDim,
    fontSize: 12,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: 'center',
  },
  btnSecondaryText: { color: Colors.gold, fontSize: 15, fontWeight: '600' },
  btnPrimary: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.gold,
    alignItems: 'center',
  },
  btnPrimaryText: { color: Colors.background, fontSize: 15, fontWeight: '700' },
});
