// ============================================================
// Coach DM · Phase 6 · ChallengesListScreen
// Liste des challenges (active / upcoming / completed)
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  COACH_DM_COLORS,
  computeChallengeDaysLeft,
  formatChallengeMetric,
  tCommunity,
  type Challenge,
  type ChallengeMetric,
  type Lang,
} from "@coachdm/shared/community";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLang } from "../../lib/useLang";

type Tab = "active" | "upcoming" | "completed";

interface ChallengeWithMeta extends Challenge {
  participants_count: number;
  my_progress?: { current_value: number; progress_pct: number; rank: number | null };
}

export function ChallengesListScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const lang: Lang = useLang();
  const [tab, setTab] = useState<Tab>("active");
  const [challenges, setChallenges] = useState<ChallengeWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const t = useCallback((k: any) => tCommunity(lang, k), [lang]);

  const fetch = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    let query = supabase
      .from("community_challenges")
      .select("*")
      .order("starts_at", { ascending: false });

    if (tab === "active") {
      query = query.eq("status", "active").lte("starts_at", today).gte("ends_at", today);
    } else if (tab === "upcoming") {
      query = query.in("status", ["active", "draft"]).gt("starts_at", today);
    } else {
      query = query.in("status", ["completed", "cancelled"]);
    }

    const { data } = await query;
    const list = (data ?? []) as Challenge[];

    // Pour chaque challenge, fetch participation perso + count
    const withMeta: ChallengeWithMeta[] = await Promise.all(
      list.map(async (c) => {
        const { count } = await supabase
          .from("community_challenge_participants")
          .select("id", { count: "exact", head: true })
          .eq("challenge_id", c.id);

        const { data: mine } = await supabase
          .from("community_challenge_participants")
          .select("current_value, progress_pct, rank")
          .eq("challenge_id", c.id)
          .eq("user_id", user.id)
          .maybeSingle();

        return {
          ...c,
          participants_count: count ?? 0,
          my_progress: mine
            ? {
                current_value: mine.current_value,
                progress_pct: mine.progress_pct,
                rank: mine.rank,
              }
            : undefined,
        };
      }),
    );

    setChallenges(withMeta);
    setLoading(false);
  }, [user, tab]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COACH_DM_COLORS.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("challenges_title")}</Text>
      </View>

      <View style={styles.tabs}>
        {(["active", "upcoming", "completed"] as Tab[]).map((tk) => (
          <Pressable
            key={tk}
            style={[styles.tab, tab === tk && styles.tabActive]}
            onPress={() => setTab(tk)}
          >
            <Text style={[styles.tabText, tab === tk && styles.tabTextActive]}>
              {tk === "active"
                ? t("challenges_active")
                : tk === "upcoming"
                  ? t("challenges_upcoming")
                  : t("challenges_completed")}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={challenges}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COACH_DM_COLORS.gold} />
        }
        ListEmptyComponent={<Text style={styles.empty}>{t("challenges_empty")}</Text>}
        renderItem={({ item }) => (
          <ChallengeCard
            challenge={item}
            lang={lang}
            t={t}
            onPress={() => navigation.navigate("ChallengeDetail", { challengeId: item.id })}
          />
        )}
      />
    </View>
  );
}

function ChallengeCard({
  challenge,
  lang,
  t,
  onPress,
}: {
  challenge: ChallengeWithMeta;
  lang: Lang;
  t: (k: any) => string;
  onPress: () => void;
}) {
  const title = lang === "en" ? challenge.title_en : lang === "nl" ? challenge.title_nl : challenge.title_fr;
  const daysLeft = useMemo(() => computeChallengeDaysLeft(challenge.ends_at), [challenge.ends_at]);
  const targetLabel = formatChallengeMetric(challenge.metric as ChallengeMetric, challenge.target_value);
  const metricLabel = t(`challenge_metric_${challenge.metric}`);
  const my = challenge.my_progress;
  const pct = my?.progress_pct ?? 0;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {challenge.cover_image_url ? (
        <Image source={{ uri: challenge.cover_image_url }} style={styles.coverImage} />
      ) : (
        <View style={[styles.coverImage, styles.coverPh]}>
          <Text style={styles.coverPhText}>🏆</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardMetric}>
          {metricLabel} · {targetLabel}
        </Text>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${pct}%`,
                backgroundColor: pct >= 100 ? COACH_DM_COLORS.green : COACH_DM_COLORS.gold,
              },
            ]}
          />
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {my
              ? `${formatChallengeMetric(challenge.metric as ChallengeMetric, my.current_value)} / ${targetLabel}`
              : `— / ${targetLabel}`}
          </Text>
          <Text style={styles.statText}>
            {daysLeft > 0 ? `${daysLeft} ${t("challenge_days_left")}` : t("challenge_completed")}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            👥 {challenge.participants_count} {t("challenge_participants")}
          </Text>
          {my?.rank ? (
            <Text style={[styles.metaText, { color: COACH_DM_COLORS.gold }]}>#{my.rank}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COACH_DM_COLORS.bg },
  header: { padding: 16, paddingTop: 56 },
  title: { color: COACH_DM_COLORS.gold, fontSize: 28, fontWeight: "800" },
  tabs: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  tabActive: { backgroundColor: COACH_DM_COLORS.gold, borderColor: COACH_DM_COLORS.gold },
  tabText: { color: COACH_DM_COLORS.textMuted, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: COACH_DM_COLORS.bg },
  empty: { color: COACH_DM_COLORS.textMuted, textAlign: "center", marginTop: 60 },

  card: {
    marginBottom: 14,
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
    overflow: "hidden",
  },
  coverImage: { width: "100%", height: 120 },
  coverPh: { backgroundColor: "#1f1f1f", alignItems: "center", justifyContent: "center" },
  coverPhText: { fontSize: 48 },
  cardBody: { padding: 14 },
  cardTitle: { color: COACH_DM_COLORS.text, fontSize: 17, fontWeight: "800", marginBottom: 4 },
  cardMetric: { color: COACH_DM_COLORS.gold, fontSize: 13, marginBottom: 12, fontWeight: "600" },
  progressBar: {
    height: 8,
    backgroundColor: "#1f1f1f",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  statText: { color: COACH_DM_COLORS.textMuted, fontSize: 12 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  metaText: { color: COACH_DM_COLORS.textMuted, fontSize: 12, fontWeight: "600" },
});

export default ChallengesListScreen;
