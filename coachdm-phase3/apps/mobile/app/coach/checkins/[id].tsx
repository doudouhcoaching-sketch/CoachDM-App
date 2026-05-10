// apps/mobile/app/coach/checkins/[id].tsx
// ============================================================
// Coach DM · Mobile · Coach reviews a client check-in
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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createCheckInsClient,
  type CheckInWithPhotos,
  coachI18n,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { Colors } from '@/lib/theme';

export default function CoachReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const supabase = useSupabase();
  const { locale } = useLocale();
  const router = useRouter();
  const i = coachI18n.checkIns;

  const checkIns = useMemo(() => createCheckInsClient(supabase), [supabase]);

  const [checkIn, setCheckIn] = useState<CheckInWithPhotos | null>(null);
  const [feedback, setFeedback] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*, photos:check_in_photos(*)')
        .eq('id', id)
        .single();
      if (error) {
        Alert.alert('Error', error.message);
        router.back();
        return;
      }
      setCheckIn(data as CheckInWithPhotos);
      setFeedback(data.coach_feedback ?? '');
      setActionItems(data.coach_action_items ?? '');
      setLoading(false);
    })();
  }, [id]);

  const submit = async () => {
    if (!checkIn) return;
    setSaving(true);
    try {
      await checkIns.coachReview(checkIn.id, feedback, actionItems);
      Alert.alert('✓', locale === 'fr' ? 'Retour envoyé' : 'Feedback sent');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !checkIn) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.gold,
          headerTitle: locale === 'fr' ? 'Examen check-in' : 'Review',
        }}
      />

      <Text style={styles.weekLabel}>
        {locale === 'fr' ? 'Semaine du' : locale === 'en' ? 'Week of' : 'Week van'}{' '}
        {new Date(checkIn.week_start_date).toLocaleDateString(locale)}
      </Text>

      {/* ── Metrics summary ──────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{i.section_metrics[locale]}</Text>
        <MetricGrid checkIn={checkIn} locale={locale} />
      </View>

      {/* ── Feelings (1-5) ──────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{i.section_feelings[locale]}</Text>
        <FeelingRow label={i.energy[locale]} value={checkIn.energy_level} />
        <FeelingRow label={i.sleep[locale]} value={checkIn.sleep_quality} />
        <FeelingRow label={i.stress[locale]} value={checkIn.stress_level} />
        <FeelingRow label={i.motivation[locale]} value={checkIn.motivation_level} />
        <FeelingRow label={i.hunger[locale]} value={checkIn.hunger_level} />
        <FeelingRow label={i.soreness[locale]} value={checkIn.soreness_level} />
      </View>

      {/* ── Adherence ────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{i.section_adherence[locale]}</Text>
        <Text style={styles.metricBig}>
          {checkIn.workouts_completed ?? 0} / {checkIn.workouts_planned ?? '—'}{' '}
          {locale === 'fr' ? 'séances' : locale === 'en' ? 'sessions' : 'sessies'}
        </Text>
        {checkIn.nutrition_adherence_pct !== null && (
          <Text style={styles.metric}>
            {i.nutrition_adherence[locale]}: {checkIn.nutrition_adherence_pct}%
          </Text>
        )}
      </View>

      {/* ── Photos ───────────────────────────────────────────── */}
      {checkIn.photos && checkIn.photos.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i.section_photos[locale]}</Text>
          <View style={styles.photosRow}>
            {checkIn.photos.map((p) => (
              <View key={p.id} style={styles.photoBox}>
                <PhotoView path={p.storage_path} />
                <Text style={styles.photoLabel}>
                  {i[`pose_${p.pose}` as 'pose_front']?.[locale] ?? p.pose}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Client notes ─────────────────────────────────────── */}
      {(checkIn.client_wins || checkIn.client_struggles || checkIn.client_notes) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i.section_notes[locale]}</Text>
          {checkIn.client_wins && (
            <NoteBlock label={i.wins[locale]} value={checkIn.client_wins} />
          )}
          {checkIn.client_struggles && (
            <NoteBlock label={i.struggles[locale]} value={checkIn.client_struggles} />
          )}
          {checkIn.client_notes && (
            <NoteBlock label={i.free_notes[locale]} value={checkIn.client_notes} />
          )}
        </View>
      )}

      {/* ── Coach response ───────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{i.coach_feedback[locale]}</Text>
        <TextInput
          value={feedback}
          onChangeText={setFeedback}
          multiline
          placeholder={
            locale === 'fr'
              ? 'Tes observations, encouragements, analyse…'
              : 'Your observations, encouragement, analysis…'
          }
          placeholderTextColor={Colors.textDim}
          style={styles.textarea}
        />

        <Text style={[styles.cardTitle, { marginTop: 16 }]}>
          {i.coach_action_items[locale]}
        </Text>
        <TextInput
          value={actionItems}
          onChangeText={setActionItems}
          multiline
          placeholder={
            locale === 'fr'
              ? 'Actions concrètes pour la semaine prochaine…'
              : 'Concrete actions for next week…'
          }
          placeholderTextColor={Colors.textDim}
          style={styles.textarea}
        />
      </View>

      <Pressable
        onPress={submit}
        disabled={saving}
        style={({ pressed }) => [
          styles.submitBtn,
          pressed && { opacity: 0.85 },
        ]}
      >
        {saving ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.submitBtnText}>
            {locale === 'fr'
              ? 'Envoyer le retour'
              : locale === 'en'
                ? 'Send feedback'
                : 'Feedback verzenden'}
          </Text>
        )}
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function MetricGrid({
  checkIn,
  locale,
}: {
  checkIn: CheckInWithPhotos;
  locale: 'fr' | 'en' | 'nl';
}) {
  const i = coachI18n.checkIns;
  const items = [
    { label: i.weight[locale], value: checkIn.weight_kg, unit: 'kg' },
    { label: i.body_fat[locale], value: checkIn.body_fat_pct, unit: '%' },
    { label: i.waist[locale].split(' ')[0], value: checkIn.waist_cm, unit: 'cm' },
    { label: i.hips[locale].split(' ')[0], value: checkIn.hips_cm, unit: 'cm' },
    { label: i.chest[locale].split(' ')[0], value: checkIn.chest_cm, unit: 'cm' },
    { label: i.arm[locale].split(' ')[0], value: checkIn.arm_cm, unit: 'cm' },
    { label: i.thigh[locale].split(' ')[0], value: checkIn.thigh_cm, unit: 'cm' },
  ].filter((m) => m.value !== null);

  return (
    <View style={styles.grid}>
      {items.map((m, idx) => (
        <View key={idx} style={styles.gridItem}>
          <Text style={styles.gridValue}>
            {m.value} {m.unit}
          </Text>
          <Text style={styles.gridLabel}>{m.label}</Text>
        </View>
      ))}
    </View>
  );
}

function FeelingRow({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <View style={styles.feelingRow}>
      <Text style={styles.feelingLabel}>{label}</Text>
      <View style={styles.feelingDots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <View
            key={n}
            style={[
              styles.feelingDot,
              n <= value && styles.feelingDotActive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.feelingValue}>{value}/5</Text>
    </View>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteLabel}>{label}</Text>
      <Text style={styles.noteValue}>{value}</Text>
    </View>
  );
}

function PhotoView({ path }: { path: string }) {
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
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekLabel: {
    color: Colors.gold,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 8,
  },
  gridValue: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  gridLabel: { color: Colors.textDim, fontSize: 11, marginTop: 2 },
  metricBig: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  metric: { color: Colors.text, fontSize: 14, marginTop: 6 },
  feelingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  feelingLabel: { color: Colors.text, fontSize: 13, flex: 1 },
  feelingDots: { flexDirection: 'row', gap: 4 },
  feelingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  feelingDotActive: { backgroundColor: Colors.gold },
  feelingValue: { color: Colors.textDim, fontSize: 12, width: 30, textAlign: 'right' },
  note: { marginBottom: 10 },
  noteLabel: { color: Colors.textDim, fontSize: 12, marginBottom: 4 },
  noteValue: { color: Colors.text, fontSize: 14, lineHeight: 20 },
  photosRow: { flexDirection: 'row', gap: 8 },
  photoBox: { flex: 1 },
  photoImg: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
  },
  photoEmpty: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  photoLabel: {
    color: Colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  textarea: {
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: Colors.background, fontSize: 15, fontWeight: '700' },
});
