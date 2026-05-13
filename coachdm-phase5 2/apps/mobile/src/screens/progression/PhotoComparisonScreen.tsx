// =====================================================================
// Coach DM · Phase 5 · PhotoComparisonScreen
// Slider avant/après + Timeline grille
// =====================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import {
  COACH_DM_COLORS,
  t,
  formatDate,
  type Locale,
  type PhotoPose,
  type ProgressPhoto,
} from '@coachdm/shared/progression';
import { supabase } from '../../lib/supabase';
import { BeforeAfterSlider } from '../../components/progression/BeforeAfterSlider';

interface Props {
  locale?: Locale;
}

type ViewMode = 'slider' | 'timeline';
type Pose = PhotoPose;

const POSES: { key: Pose; labelKey: 'pose_front' | 'pose_side_left' | 'pose_side_right' | 'pose_back' }[] = [
  { key: 'front', labelKey: 'pose_front' },
  { key: 'side_left', labelKey: 'pose_side_left' },
  { key: 'side_right', labelKey: 'pose_side_right' },
  { key: 'back', labelKey: 'pose_back' },
];

export function PhotoComparisonScreen({ locale = 'fr' }: Props) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [pose, setPose] = useState<Pose>('front');
  const [viewMode, setViewMode] = useState<ViewMode>('slider');
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('pose', pose)
      .is('deleted_at', null)
      .order('taken_at', { ascending: true });
    if (data) {
      const p = data as ProgressPhoto[];
      setPhotos(p);
      if (p.length >= 2) {
        setBeforeId(p[0].id);
        setAfterId(p[p.length - 1].id);
      } else {
        setBeforeId(null);
        setAfterId(null);
      }
      // Signed URLs (1h)
      const urls: Record<string, string> = {};
      for (const ph of p) {
        const { data: signed } = await supabase.storage
          .from('progress-photos')
          .createSignedUrl(ph.storage_path, 3600);
        if (signed?.signedUrl) urls[ph.id] = signed.signedUrl;
      }
      setSignedUrls(urls);
    }
  };

  useEffect(() => {
    load();
  }, [pose]);

  const handleAddPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        locale === 'fr' ? 'Permission requise' : locale === 'en' ? 'Permission required' : 'Toestemming vereist'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${Date.now()}.${ext}`;
      const path = `${user.id}/${pose}/${fileName}`;

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error: upErr } = await supabase.storage
        .from('progress-photos')
        .upload(path, decode(base64), {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: false,
        });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from('progress_photos').insert({
        user_id: user.id,
        pose,
        storage_path: path,
        visible_to_coach: true,
      });
      if (insErr) throw insErr;

      await load();
    } catch (e: any) {
      Alert.alert('Upload error', e.message ?? String(e));
    } finally {
      setUploading(false);
    }
  };

  const saveComparison = async () => {
    if (!beforeId || !afterId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('photo_comparisons').insert({
      user_id: user.id,
      before_photo_id: beforeId,
      after_photo_id: afterId,
      title: `${pose} · ${new Date().toISOString().slice(0, 10)}`,
    });
    Alert.alert(t('save_comparison', locale), '✓');
  };

  const beforePhoto = useMemo(() => photos.find((p) => p.id === beforeId), [photos, beforeId]);
  const afterPhoto = useMemo(() => photos.find((p) => p.id === afterId), [photos, afterId]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('progress_photos', locale)}</Text>

      {/* Pose tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {POSES.map((p) => (
          <Pressable
            key={p.key}
            style={[styles.tab, pose === p.key && styles.tabActive]}
            onPress={() => setPose(p.key)}
          >
            <Text
              style={[
                styles.tabText,
                pose === p.key && { color: COACH_DM_COLORS.bg, fontWeight: '700' },
              ]}
            >
              {t(p.labelKey, locale)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Add photo */}
      <Pressable style={styles.addBtn} onPress={handleAddPhoto} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator color={COACH_DM_COLORS.bg} />
        ) : (
          <Text style={styles.addBtnText}>+ {t('add_photo', locale)}</Text>
        )}
      </Pressable>

      {/* View mode toggle */}
      <View style={styles.viewToggle}>
        <Pressable
          style={[styles.viewBtn, viewMode === 'slider' && styles.viewBtnActive]}
          onPress={() => setViewMode('slider')}
        >
          <Text
            style={[
              styles.viewBtnText,
              viewMode === 'slider' && { color: COACH_DM_COLORS.bg, fontWeight: '700' },
            ]}
          >
            {t('slider_view', locale)}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.viewBtn, viewMode === 'timeline' && styles.viewBtnActive]}
          onPress={() => setViewMode('timeline')}
        >
          <Text
            style={[
              styles.viewBtnText,
              viewMode === 'timeline' && { color: COACH_DM_COLORS.bg, fontWeight: '700' },
            ]}
          >
            {t('timeline_view', locale)}
          </Text>
        </Pressable>
      </View>

      {photos.length < 2 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {locale === 'fr'
              ? 'Ajoute au moins 2 photos pour comparer.'
              : locale === 'en'
              ? 'Add at least 2 photos to compare.'
              : 'Voeg minstens 2 foto\'s toe om te vergelijken.'}
          </Text>
        </View>
      ) : viewMode === 'slider' ? (
        <View>
          {beforePhoto && afterPhoto && signedUrls[beforePhoto.id] && signedUrls[afterPhoto.id] ? (
            <BeforeAfterSlider
              beforeUri={signedUrls[beforePhoto.id]}
              afterUri={signedUrls[afterPhoto.id]}
            />
          ) : (
            <ActivityIndicator color={COACH_DM_COLORS.gold} />
          )}

          {/* Labels */}
          <View style={styles.compareLabels}>
            <View style={{ flex: 1 }}>
              <Text style={styles.compareLabel}>{t('before', locale)}</Text>
              <Text style={styles.compareDate}>
                {beforePhoto ? formatDate(beforePhoto.taken_at, locale) : '—'}
              </Text>
              {beforePhoto?.weight_kg ? (
                <Text style={styles.compareWeight}>{beforePhoto.weight_kg} kg</Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.compareLabel}>{t('after', locale)}</Text>
              <Text style={styles.compareDate}>
                {afterPhoto ? formatDate(afterPhoto.taken_at, locale) : '—'}
              </Text>
              {afterPhoto?.weight_kg ? (
                <Text style={styles.compareWeight}>{afterPhoto.weight_kg} kg</Text>
              ) : null}
            </View>
          </View>

          {/* Select before/after from row */}
          <Text style={styles.helpText}>
            {locale === 'fr'
              ? 'Tape une miniature pour changer la photo "avant" (gauche) ou "après" (droite)'
              : locale === 'en'
              ? 'Tap a thumbnail to change the "before" (left) or "after" (right) photo'
              : 'Tik op een miniatuur om de "voor" (links) of "na" (rechts) foto te wijzigen'}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
            {photos.map((ph) => (
              <Pressable
                key={ph.id}
                onPress={() =>
                  beforeId === ph.id ? null : afterId === ph.id ? null : setAfterId(ph.id)
                }
                onLongPress={() => setBeforeId(ph.id)}
              >
                <View>
                  {signedUrls[ph.id] ? (
                    <Image source={{ uri: signedUrls[ph.id] }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, { justifyContent: 'center', alignItems: 'center' }]}>
                      <ActivityIndicator color={COACH_DM_COLORS.gold} />
                    </View>
                  )}
                  {beforeId === ph.id ? (
                    <View style={[styles.thumbBadge, { backgroundColor: COACH_DM_COLORS.blue }]}>
                      <Text style={styles.thumbBadgeText}>A</Text>
                    </View>
                  ) : null}
                  {afterId === ph.id ? (
                    <View style={[styles.thumbBadge, { backgroundColor: COACH_DM_COLORS.gold }]}>
                      <Text style={styles.thumbBadgeText}>B</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable style={styles.saveBtn} onPress={saveComparison}>
            <Text style={styles.saveBtnText}>{t('save_comparison', locale)}</Text>
          </Pressable>
        </View>
      ) : (
        /* Timeline grid */
        <View style={styles.grid}>
          {photos.map((ph) => (
            <View key={ph.id} style={styles.gridItem}>
              {signedUrls[ph.id] ? (
                <Image source={{ uri: signedUrls[ph.id] }} style={styles.gridImage} />
              ) : (
                <View style={[styles.gridImage, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator color={COACH_DM_COLORS.gold} />
                </View>
              )}
              <Text style={styles.gridDate}>{formatDate(ph.taken_at, locale)}</Text>
              {ph.weight_kg ? <Text style={styles.gridMeta}>{ph.weight_kg} kg</Text> : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  content: { padding: 16, paddingBottom: 80 },
  title: { color: COACH_DM_COLORS.gold, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  tabs: { gap: 6, paddingVertical: 4, marginBottom: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 16,
  },
  tabActive: { backgroundColor: COACH_DM_COLORS.gold },
  tabText: { color: COACH_DM_COLORS.textPrimary, fontSize: 12 },
  addBtn: {
    backgroundColor: COACH_DM_COLORS.gold,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  addBtnText: { color: COACH_DM_COLORS.bg, fontSize: 14, fontWeight: '700' },
  viewToggle: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  viewBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewBtnActive: { backgroundColor: COACH_DM_COLORS.gold },
  viewBtnText: { color: COACH_DM_COLORS.textPrimary, fontSize: 13 },
  emptyBox: {
    backgroundColor: COACH_DM_COLORS.cardBg,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: { color: COACH_DM_COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  compareLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  compareLabel: { color: COACH_DM_COLORS.gold, fontSize: 13, fontWeight: '700' },
  compareDate: { color: COACH_DM_COLORS.textPrimary, fontSize: 12, marginTop: 2 },
  compareWeight: { color: COACH_DM_COLORS.textSecondary, fontSize: 11 },
  helpText: {
    color: COACH_DM_COLORS.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 12,
    marginBottom: 6,
  },
  thumbRow: { paddingVertical: 8, gap: 8 },
  thumb: {
    width: 60,
    height: 80,
    borderRadius: 6,
    marginRight: 6,
    backgroundColor: COACH_DM_COLORS.cardBg,
  },
  thumbBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadgeText: { color: COACH_DM_COLORS.bg, fontWeight: '800', fontSize: 11 },
  saveBtn: {
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.gold,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: { color: COACH_DM_COLORS.gold, fontSize: 14, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: 12 },
  gridImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: COACH_DM_COLORS.cardBg,
  },
  gridDate: { color: COACH_DM_COLORS.textPrimary, fontSize: 12, marginTop: 6, fontWeight: '600' },
  gridMeta: { color: COACH_DM_COLORS.textSecondary, fontSize: 11 },
});
