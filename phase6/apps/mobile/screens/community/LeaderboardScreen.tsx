// ============================================================
// Coach DM · Phase 6 · LeaderboardScreen
// Classements hebdo + mensuels (6 métriques)
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  COACH_DM_COLORS,
  formatChallengeMetric,
  getCurrentMonthStart,
  getCurrentWeekStart,
  tCommunity,
  type Lang,
  type LeaderboardEntryWithProfile,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from "@coachdm/shared/community";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLang } from "../../lib/useLang";

const METRICS: LeaderboardMetric[] = [
  "workouts_count",
  "total_volume_kg",
  "cardio_distance_km",
  "cardio_duration_min",
  "sleep_hours_avg",
  "recovery_score_avg",
];

export function LeaderboardScreen() {
  const { user } = useAuth();
  const lang: Lang = useLang();
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [metric, setMetric] = useState<LeaderboardMetric>("workouts_count");
  const [entries, setEntries] = useState<LeaderboardEntryWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [optIn, setOptIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [showAvatar, setShowAvatar] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const t = useCallback((k: any) => tCommunity(lang, k), [lang]);
  const periodStart = useMemo(
    () => (period === "week" ? getCurrentWeekStart() : getCurrentMonthStart()),
    [period],
  );

  const fetchPrefs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("leaderboard_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setOptIn(data.participates);
      setDisplayName(data.display_name ?? "");
      setShowAvatar(data.show_avatar);
    }
  }, [user]);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: prof } = await supabase
      .from("profiles")
      .select("coach_id, role, id")
      .eq("id", user.id)
      .single();
    const coachId = prof?.role === "coach" ? prof.id : prof?.coach_id;
    if (!coachId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("leaderboard_entries")
      .select(
        `*, profile:profiles!leaderboard_entries_user_id_fkey ( id, full_name, avatar_url )`,
      )
      .eq("coach_id", coachId)
      .eq("period", period)
      .eq("period_start", periodStart)
      .eq("metric", metric)
      .order("rank", { ascending: true, nullsFirst: false });
    setEntries((data ?? []) as LeaderboardEntryWithProfile[]);
    setLoading(false);
  }, [user, period, metric, periodStart]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const savePrefs = async () => {
    if (!user) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("coach_id")
      .eq("id", user.id)
      .single();
    await supabase.from("leaderboard_preferences").upsert(
      {
        user_id: user.id,
        coach_id: prof?.coach_id ?? null,
        participates: optIn,
        display_name: displayName || null,
        show_avatar: showAvatar,
      },
      { onConflict: "user_id" },
    );
    setSettingsOpen(false);
    fetchEntries();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("lb_title")}</Text>
        <Pressable onPress={() => setSettingsOpen((v) => !v)} style={styles.iconBtn}>
          <Text style={styles.iconText}>⚙️</Text>
        </Pressable>
      </View>

      {settingsOpen ? (
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t("lb_opt_in")}</Text>
            <Switch
              value={optIn}
              onValueChange={setOptIn}
              trackColor={{ false: "#1f1f1f", true: COACH_DM_COLORS.gold }}
              thumbColor={COACH_DM_COLORS.text}
            />
          </View>
          <Text style={styles.settingDesc}>{t("lb_opt_in_desc")}</Text>

          {optIn ? (
            <>
              <Text style={[styles.settingLabel, { marginTop: 12 }]}>{t("lb_display_name")}</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Doudouh M."
                placeholderTextColor={COACH_DM_COLORS.textMuted}
                style={styles.input}
              />
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>{t("lb_show_avatar")}</Text>
                <Switch
                  value={showAvatar}
                  onValueChange={setShowAvatar}
                  trackColor={{ false: "#1f1f1f", true: COACH_DM_COLORS.gold }}
                  thumbColor={COACH_DM_COLORS.text}
                />
              </View>
            </>
          ) : null}
          <Pressable onPress={savePrefs} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{t("lb_save")}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Period switcher */}
      <View style={styles.row}>
        {(["week", "month"] as LeaderboardPeriod[]).map((p) => (
          <Pressable
            key={p}
            style={[styles.chip, period === p && styles.chipActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.chipText, period === p && styles.chipTextActive]}>
              {p === "week" ? t("lb_week") : t("lb_month")}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Metric switcher */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsScroll}>
        <View style={styles.metricsRow}>
          {METRICS.map((m) => (
            <Pressable
              key={m}
              style={[styles.metricChip, metric === m && styles.metricChipActive]}
              onPress={() => setMetric(m)}
            >
              <Text style={[styles.metricText, metric === m && styles.metricTextActive]}>
                {t(`challenge_metric_${m}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COACH_DM_COLORS.gold} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.empty}>{t("lb_no_data")}</Text>
          {!optIn ? (
            <Text style={[styles.empty, { marginTop: 6, fontSize: 13 }]}>
              {t("lb_not_participating")}
            </Text>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item, index }) => {
            const isMe = item.user_id === user?.id;
            const top3 = (item.rank ?? index + 1) <= 3;
            const medal = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : null;
            return (
              <View
                style={[
                  styles.entryRow,
                  isMe && { borderColor: COACH_DM_COLORS.gold, borderWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.rank,
                    top3 && { color: COACH_DM_COLORS.gold, fontWeight: "800" },
                  ]}
                >
                  {medal ?? `#${item.rank ?? index + 1}`}
                </Text>
                {item.profile.avatar_url ? (
                  <Image source={{ uri: item.profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPh}>
                    <Text style={styles.avatarPhText}>
                      {(item.profile.full_name ?? "?").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.name} numberOfLines={1}>
                  {item.profile.display_name ?? item.profile.full_name ?? "—"}
                </Text>
                <Text style={styles.value}>{formatChallengeMetric(metric as any, item.value)}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 56,
  },
  title: { color: COACH_DM_COLORS.gold, fontSize: 28, fontWeight: "800" },
  iconBtn: { padding: 8 },
  iconText: { fontSize: 22 },
  empty: { color: COACH_DM_COLORS.textMuted, textAlign: "center" },

  settingsCard: {
    margin: 16,
    padding: 14,
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  settingLabel: { color: COACH_DM_COLORS.text, fontWeight: "600", fontSize: 14 },
  settingDesc: { color: COACH_DM_COLORS.textMuted, fontSize: 12, marginTop: 4 },
  input: {
    backgroundColor: "#1a1a1a",
    color: COACH_DM_COLORS.text,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  saveBtn: {
    marginTop: 12,
    backgroundColor: COACH_DM_COLORS.gold,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: { color: COACH_DM_COLORS.bg, fontWeight: "800" },

  row: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  chipActive: { backgroundColor: COACH_DM_COLORS.gold, borderColor: COACH_DM_COLORS.gold },
  chipText: { color: COACH_DM_COLORS.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: COACH_DM_COLORS.bg },

  metricsScroll: { paddingHorizontal: 16, marginVertical: 12, maxHeight: 44 },
  metricsRow: { flexDirection: "row", gap: 8 },
  metricChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  metricChipActive: { backgroundColor: COACH_DM_COLORS.bg, borderColor: COACH_DM_COLORS.gold },
  metricText: { color: COACH_DM_COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  metricTextActive: { color: COACH_DM_COLORS.gold },

  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  rank: { color: COACH_DM_COLORS.textMuted, fontWeight: "700", width: 44, fontSize: 16 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 8 },
  avatarPh: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 8,
    backgroundColor: COACH_DM_COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPhText: { color: COACH_DM_COLORS.bg, fontWeight: "800" },
  name: { flex: 1, color: COACH_DM_COLORS.text, fontWeight: "600" },
  value: { color: COACH_DM_COLORS.gold, fontWeight: "800" },
});

export default LeaderboardScreen;
