// =====================================================================
// Coach DM · Phase 5 · PRsListScreen
// Tous les records personnels groupés par catégorie (force / cardio / body)
// =====================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import {
  COACH_DM_COLORS,
  t,
  formatPRValue,
  formatPctDelta,
  formatDate,
  type Locale,
  type PersonalRecord,
  type PRCategory,
} from '@coachdm/shared/progression';
import { supabase } from '../../lib/supabase';

interface Props {
  locale?: Locale;
}

type Group = 'strength' | 'cardio' | 'body';

const STRENGTH_CATS: PRCategory[] = ['strength_1rm', 'strength_volume'];
const CARDIO_CATS: PRCategory[] = ['cardio_distance', 'cardio_duration', 'cardio_pace', 'cardio_hr_avg'];
const BODY_CATS: PRCategory[] = ['body_weight_min', 'body_weight_max', 'body_fat_min'];

function getGroup(cat: PRCategory): Group {
  if (STRENGTH_CATS.includes(cat)) return 'strength';
  if (CARDIO_CATS.includes(cat)) return 'cardio';
  return 'body';
}

function categoryLabel(cat: PRCategory, locale: Locale): string {
  const m: Record<PRCategory, { fr: string; en: string; nl: string }> = {
    strength_1rm: { fr: '1RM', en: '1RM', nl: '1RM' },
    strength_volume: { fr: 'Volume', en: 'Volume', nl: 'Volume' },
    cardio_distance: { fr: 'Distance', en: 'Distance', nl: 'Afstand' },
    cardio_duration: { fr: 'Durée', en: 'Duration', nl: 'Duur' },
    cardio_pace: { fr: 'Allure', en: 'Pace', nl: 'Tempo' },
    cardio_hr_avg: { fr: 'FC moy', en: 'Avg HR', nl: 'Gem HR' },
    body_weight_min: { fr: 'Poids min', en: 'Min weight', nl: 'Min gewicht' },
    body_weight_max: { fr: 'Poids max', en: 'Max weight', nl: 'Max gewicht' },
    body_fat_min: { fr: 'Masse grasse min', en: 'Min body fat', nl: 'Min vetpercentage' },
  };
  return m[cat][locale];
}

export function PRsListScreen({ locale = 'fr' }: Props) {
  const [allPRs, setAllPRs] = useState<PersonalRecord[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group>('strength');

  useEffect(() => {
    (async () => {
      // current_prs view returns only the best record per (category, exercise, activity)
      const { data } = await supabase
        .from('current_prs')
        .select('*')
        .order('achieved_at', { ascending: false });
      if (data) setAllPRs(data as PersonalRecord[]);
    })();
  }, []);

  const grouped = useMemo(() => {
    const out: Record<Group, PersonalRecord[]> = { strength: [], cardio: [], body: [] };
    for (const pr of allPRs) {
      out[getGroup(pr.category)].push(pr);
    }
    return out;
  }, [allPRs]);

  const current = grouped[activeGroup];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('personal_records', locale)}</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeGroup === 'strength' && styles.tabActive]}
          onPress={() => setActiveGroup('strength')}
        >
          <Text
            style={[
              styles.tabText,
              activeGroup === 'strength' && { color: COACH_DM_COLORS.bg, fontWeight: '700' },
            ]}
          >
            {t('pr_strength', locale)}
          </Text>
          <Text
            style={[
              styles.tabBadge,
              activeGroup === 'strength' && { color: COACH_DM_COLORS.bg },
            ]}
          >
            {grouped.strength.length}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeGroup === 'cardio' && styles.tabActive]}
          onPress={() => setActiveGroup('cardio')}
        >
          <Text
            style={[
              styles.tabText,
              activeGroup === 'cardio' && { color: COACH_DM_COLORS.bg, fontWeight: '700' },
            ]}
          >
            {t('pr_cardio', locale)}
          </Text>
          <Text
            style={[
              styles.tabBadge,
              activeGroup === 'cardio' && { color: COACH_DM_COLORS.bg },
            ]}
          >
            {grouped.cardio.length}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeGroup === 'body' && styles.tabActive]}
          onPress={() => setActiveGroup('body')}
        >
          <Text
            style={[
              styles.tabText,
              activeGroup === 'body' && { color: COACH_DM_COLORS.bg, fontWeight: '700' },
            ]}
          >
            {t('pr_body', locale)}
          </Text>
          <Text
            style={[
              styles.tabBadge,
              activeGroup === 'body' && { color: COACH_DM_COLORS.bg },
            ]}
          >
            {grouped.body.length}
          </Text>
        </Pressable>
      </View>

      {current.length === 0 ? (
        <Text style={styles.empty}>{t('no_prs_yet', locale)}</Text>
      ) : (
        current.map((pr) => (
          <View key={`${pr.category}-${pr.exercise_id ?? pr.activity_type ?? 'body'}`} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardCat}>{categoryLabel(pr.category, locale)}</Text>
                <Text style={styles.cardName}>
                  {pr.exercise_name ?? pr.activity_type ?? '—'}
                </Text>
              </View>
              <View style={styles.cardValueBox}>
                <Text style={styles.cardValue}>
                  {formatPRValue(pr.category, pr.value, pr.unit)}
                </Text>
                {pr.delta_pct !== null ? (
                  <Text
                    style={[
                      styles.cardDelta,
                      {
                        color:
                          pr.delta_pct > 0
                            ? COACH_DM_COLORS.green
                            : pr.delta_pct < 0
                            ? COACH_DM_COLORS.red
                            : COACH_DM_COLORS.textSecondary,
                      },
                    ]}
                  >
                    {formatPctDelta(pr.delta_pct)} vs préc.
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.cardDate}>{formatDate(pr.achieved_at, locale)}</Text>
              {pr.calc_method && pr.calc_method !== 'actual' ? (
                <Text style={styles.cardMethod}>
                  {pr.calc_method} · {pr.load_kg}kg × {pr.reps}
                </Text>
              ) : pr.reps ? (
                <Text style={styles.cardMethod}>réel · {pr.reps} rep</Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  content: { padding: 16, paddingBottom: 80 },
  title: { color: COACH_DM_COLORS.gold, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COACH_DM_COLORS.gold },
  tabText: { color: COACH_DM_COLORS.textPrimary, fontSize: 12 },
  tabBadge: { color: COACH_DM_COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  empty: { color: COACH_DM_COLORS.textSecondary, textAlign: 'center', padding: 24, fontSize: 13 },
  card: {
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 10,
    padding: 14,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: COACH_DM_COLORS.gold,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardCat: { color: COACH_DM_COLORS.textSecondary, fontSize: 11, textTransform: 'uppercase' },
  cardName: {
    color: COACH_DM_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  cardValueBox: { alignItems: 'flex-end' },
  cardValue: { color: COACH_DM_COLORS.gold, fontSize: 18, fontWeight: '800' },
  cardDelta: { fontSize: 11, marginTop: 2 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardDate: { color: COACH_DM_COLORS.textSecondary, fontSize: 11 },
  cardMethod: { color: COACH_DM_COLORS.textSecondary, fontSize: 11, fontStyle: 'italic' },
});
