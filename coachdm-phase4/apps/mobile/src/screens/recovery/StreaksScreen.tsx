// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Mobile · StreaksScreen
// ═══════════════════════════════════════════════════════════════════════════
// Vue détaillée des séries actives + collection de badges
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { theme } from '../../lib/theme';
import { CDMIcon } from '../../components/CDMIcon';
import type { RecoveryStreaks, RecoveryBadge, BadgeKind } from '@coachdm/shared/recovery';

const ALL_BADGES: BadgeKind[] = [
  'sleep_7d', 'sleep_30d', 'sleep_100d',
  'hydration_7d', 'hydration_30d', 'hydration_100d',
  'habits_7d', 'habits_30d', 'habits_100d',
  'recovery_score_80', 'recovery_score_95',
  'first_week_complete',
];

const BADGE_ICONS: Record<BadgeKind, string> = {
  sleep_7d: 'moon', sleep_30d: 'moon', sleep_100d: 'moon',
  hydration_7d: 'droplet', hydration_30d: 'droplet', hydration_100d: 'droplet',
  habits_7d: 'zap', habits_30d: 'zap', habits_100d: 'zap',
  recovery_score_80: 'star', recovery_score_95: 'star',
  first_week_complete: 'award',
};

const BADGE_COLORS: Record<BadgeKind, string> = {
  sleep_7d: '#A78BFA', sleep_30d: '#A78BFA', sleep_100d: '#D4AF37',
  hydration_7d: '#38BDF8', hydration_30d: '#38BDF8', hydration_100d: '#D4AF37',
  habits_7d: '#10B981', habits_30d: '#10B981', habits_100d: '#D4AF37',
  recovery_score_80: '#D4AF37', recovery_score_95: '#D4AF37',
  first_week_complete: '#D4AF37',
};

export function StreaksScreen() {
  const { t } = useTranslation();
  const [streaks, setStreaks] = useState<RecoveryStreaks | null>(null);
  const [badges, setBadges] = useState<RecoveryBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [s, b] = await Promise.all([
      supabase.from('recovery_streaks').select('*').eq('user_id', user.id).single(),
      supabase.from('recovery_badges').select('*').eq('user_id', user.id).order('unlocked_at', { ascending: false }),
    ]);
    setStreaks(s.data);
    setBadges(b.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.gold} />
      </View>
    );
  }

  const unlockedKinds = new Set(badges.map((b) => b.kind));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('recovery.nav.streaks')}</Text>

      {/* Streaks */}
      <View style={styles.streakCard}>
        <View style={styles.streakIcon}>
          <CDMIcon name="moon" size={24} color="#A78BFA" />
        </View>
        <View style={styles.streakBody}>
          <Text style={styles.streakLabel}>{t('recovery.streaks.sleep_streak')}</Text>
          <Text style={styles.streakCurrent}>
            {streaks?.sleep_current ?? 0} <Text style={styles.streakUnit}>{t('recovery.streaks.days')}</Text>
          </Text>
          <Text style={styles.streakBest}>
            ★ {t('recovery.streaks.best')}: {streaks?.sleep_best ?? 0}
          </Text>
        </View>
      </View>

      <View style={styles.streakCard}>
        <View style={styles.streakIcon}>
          <CDMIcon name="droplet" size={24} color="#38BDF8" />
        </View>
        <View style={styles.streakBody}>
          <Text style={styles.streakLabel}>{t('recovery.streaks.hydration_streak')}</Text>
          <Text style={styles.streakCurrent}>
            {streaks?.hydration_current ?? 0} <Text style={styles.streakUnit}>{t('recovery.streaks.days')}</Text>
          </Text>
          <Text style={styles.streakBest}>
            ★ {t('recovery.streaks.best')}: {streaks?.hydration_best ?? 0}
          </Text>
        </View>
      </View>

      <View style={styles.streakCard}>
        <View style={styles.streakIcon}>
          <CDMIcon name="zap" size={24} color="#10B981" />
        </View>
        <View style={styles.streakBody}>
          <Text style={styles.streakLabel}>{t('recovery.streaks.habits_streak')}</Text>
          <Text style={styles.streakCurrent}>
            {streaks?.habits_current ?? 0} <Text style={styles.streakUnit}>{t('recovery.streaks.days')}</Text>
          </Text>
          <Text style={styles.streakBest}>
            ★ {t('recovery.streaks.best')}: {streaks?.habits_best ?? 0}
          </Text>
        </View>
      </View>

      {/* Badges */}
      <Text style={styles.sectionTitle}>
        {t('recovery.badges.title')} · {badges.length}/{ALL_BADGES.length}
      </Text>
      <View style={styles.badgeGrid}>
        {ALL_BADGES.map((kind) => {
          const unlocked = unlockedKinds.has(kind);
          return (
            <View
              key={kind}
              style={[styles.badgeCard, !unlocked && styles.badgeLocked]}
            >
              <View
                style={[
                  styles.badgeIcon,
                  { backgroundColor: BADGE_COLORS[kind] + (unlocked ? '33' : '11') },
                ]}
              >
                <CDMIcon
                  name={BADGE_ICONS[kind]}
                  size={28}
                  color={unlocked ? BADGE_COLORS[kind] : theme.muted}
                />
              </View>
              <Text style={[styles.badgeLabel, !unlocked && { color: theme.muted }]}>
                {t(`recovery.badges.${kind}` as any)}
              </Text>
              {!unlocked && (
                <CDMIcon name="lock" size={12} color={theme.muted} />
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  title: { color: theme.gold, fontSize: 28, fontWeight: '900', marginBottom: 16 },

  streakCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: theme.muted + '22',
  },
  streakIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  streakBody: { flex: 1 },
  streakLabel: { color: theme.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  streakCurrent: { color: theme.gold, fontSize: 32, fontWeight: '900', marginVertical: 2 },
  streakUnit: { color: theme.muted, fontSize: 14, fontWeight: '400' },
  streakBest: { color: theme.muted, fontSize: 11 },

  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCard: {
    width: '31%', minHeight: 120,
    backgroundColor: theme.surface, borderRadius: 12, padding: 12,
    alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: theme.muted + '22',
  },
  badgeLocked: { opacity: 0.45 },
  badgeIcon: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  badgeLabel: { color: theme.text, fontSize: 11, textAlign: 'center', fontWeight: '600' },
});
