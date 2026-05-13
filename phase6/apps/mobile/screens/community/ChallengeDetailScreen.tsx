// ============================================================
// Coach DM · Phase 6 · ChallengeDetailScreen
// Détail challenge + leaderboard interne + bouton join/leave + log
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import {
  COACH_DM_COLORS,
  COMMUNITY_TONE_COLORS,
  COMMUNITY_TONE_ICONS,
  computeChallengeDaysLeft,
  computeChallengeIdealPace,
  formatChallengeMetric,
  isParticipantBehind,
  tCommunity,
  type Challenge,
  type ChallengeMetric,
  type ChallengeParticipantWithProfile,
  type Lang,
} from "@coachdm/shared/community";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLang } from "../../lib/useLang";

export function ChallengeDetailScreen() {
  const route = useRoute<any>();
  const challengeId: string = route.params?.challengeId;
  const { user } = useAuth();
  const lang: Lang = useLang();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<ChallengeParticipantWithProfile[]>([]);
  const [meParticipant, setMeParticipant] = useState<ChallengeParticipantWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logValue, setLogValue] = useState("");
  const [logNote, setLogNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const t = useCallback((k: any) => tCommunity(lang, k), [lang]);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data: c } = await supabase
      .from("community_challenges")
      .select("*")
      .eq("id", challengeId)
      .single();
    setChallenge((c as Challenge) ?? null);

    const { data: parts } = await supabase
      .from("community_challenge_participants")
      .select(
        `*, profile:profiles!community_challenge_participants_user_id_fkey ( id, full_name, avatar_url )`,
      )
      .eq("challenge_id", challengeId)
      .order("current_value", { ascending: false });
    const list = (parts ?? []) as ChallengeParticipantWithProfile[];
    setParticipants(list);
    setMeParticipant(list.find((p) => p.user_id === user.id) ?? null);

    setLoading(false);
  }, [challengeId, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    const channel = supabase
      .channel(`challenge_${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_challenge_participants",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => fetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, fetch]);

  const join = async () => {
    if (!user) return;
    await supabase
      .from("community_challenge_participants")
      .insert({ challenge_id: challengeId, user_id: user.id });
    // Trigger recompute immédiat
    await supabase.rpc("fn_recompute_challenge_participant", {
      p_challenge_id: challengeId,
      p_user_id: user.id,
    });
    fetch();
  };

  const leave = async () => {
    if (!user) return;
    Alert.alert(
      lang === "fr" ? "Quitter ce challenge ?" : lang === "nl" ? "Uitdaging verlaten?" : "Leave this challenge?",
      lang === "fr"
        ? "Ta progression sera perdue."
        : lang === "nl"
          ? "Je voortgang gaat verloren."
          : "Your progress will be lost.",
      [
        { text: lang === "fr" ? "Annuler" : "Cancel", style: "cancel" },
        {
          text: lang === "fr" ? "Quitter" : lang === "nl" ? "Verlaten" : "Leave",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("community_challenge_participants")
              .delete()
              .match({ challenge_id: challengeId, user_id: user.id });
            fetch();
          },
        },
      ],
    );
  };

  const submitCustomValue = async () => {
    if (!user || !challenge) return;
    const v = parseFloat(logValue.replace(",", "."));
    if (isNaN(v) || v <= 0) return;
    setSubmitting(true);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("community_challenge_entries").upsert(
      {
        challenge_id: challengeId,
        user_id: user.id,
        entry_date: today,
        value: v,
        note: logNote || null,
      },
      { onConflict: "challenge_id,user_id,entry_date" },
    );
    if (!error) {
      setLogValue("");
      setLogNote("");
      fetch();
    }
    setSubmitting(false);
  };

  if (loading || !challenge) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COACH_DM_COLORS.gold} />
      </View>
    );
  }

  const title = lang === "en" ? challenge.title_en : lang === "nl" ? challenge.title_nl : challenge.title_fr;
  const desc = lang === "en" ? challenge.description_en : lang === "nl" ? challenge.description_nl : challenge.description_fr;
  const daysLeft = computeChallengeDaysLeft(challenge.ends_at);
  const targetLabel = formatChallengeMetric(challenge.metric as ChallengeMetric, challenge.target_value);
  const metricLabel = t(`challenge_metric_${challenge.metric}`);
  const idealPace = computeChallengeIdealPace(challenge);
  const isBehind = meParticipant
    ? isParticipantBehind(meParticipant, challenge)
    : false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      {challenge.cover_image_url ? (
        <Image source={{ uri: challenge.cover_image_url }} style={styles.cover} />
      ) : null}

      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.metric}>
          {metricLabel} · {targetLabel}
        </Text>
        {desc ? <Text style={styles.desc}>{desc}</Text> : null}

        {/* Stats principales */}
        <View style={styles.statsCard}>
          <Stat label={t("challenge_days_left")} value={`${daysLeft}`} />
          <Stat
            label={t("challenge_ideal_pace")}
            value={formatChallengeMetric(challenge.metric as ChallengeMetric, idealPace) + "/j"}
          />
          <Stat
            label={t("challenge_participants")}
            value={`${participants.length}`}
          />
        </View>

        {/* Ma progression */}
        {meParticipant ? (
          <View style={styles.meCard}>
            <Text style={styles.meTitle}>{t("challenge_progress")}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, meParticipant.progress_pct)}%`,
                    backgroundColor:
                      meParticipant.progress_pct >= 100
                        ? COACH_DM_COLORS.green
                        : COACH_DM_COLORS.gold,
                  },
                ]}
              />
            </View>
            <Text style={styles.meValue}>
              {formatChallengeMetric(challenge.metric as ChallengeMetric, meParticipant.current_value)} / {targetLabel} · {meParticipant.progress_pct}%
            </Text>
            {meParticipant.rank ? (
              <Text style={styles.meRank}>
                {t("challenge_rank")} #{meParticipant.rank}
              </Text>
            ) : null}

            <View
              style={[
                styles.insightRow,
                {
                  borderLeftColor: isBehind
                    ? COMMUNITY_TONE_COLORS.warning
                    : COMMUNITY_TONE_COLORS.insight,
                },
              ]}
            >
              <Text
                style={[
                  styles.insightIcon,
                  { color: isBehind ? COMMUNITY_TONE_COLORS.warning : COMMUNITY_TONE_COLORS.insight },
                ]}
              >
                {isBehind ? COMMUNITY_TONE_ICONS.warning : COMMUNITY_TONE_ICONS.insight}
              </Text>
              <Text style={styles.insightText}>
                {isBehind ? t("challenge_you_are_behind") : t("challenge_you_are_on_track")}
              </Text>
            </View>

            <Pressable style={styles.leaveBtn} onPress={leave}>
              <Text style={styles.leaveBtnText}>{t("challenges_leave")}</Text>
            </Pressable>

            {challenge.metric === "custom_metric" ? (
              <View style={styles.customLog}>
                <Text style={styles.customTitle}>{t("challenge_log_value")}</Text>
                <TextInput
                  value={logValue}
                  onChangeText={setLogValue}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={COACH_DM_COLORS.textMuted}
                  style={styles.input}
                />
                <TextInput
                  value={logNote}
                  onChangeText={setLogNote}
                  placeholder={lang === "fr" ? "Note (optionnel)" : lang === "nl" ? "Notitie (optioneel)" : "Note (optional)"}
                  placeholderTextColor={COACH_DM_COLORS.textMuted}
                  style={styles.input}
                />
                <Pressable
                  onPress={submitCustomValue}
                  disabled={submitting || !logValue}
                  style={[styles.submitBtn, (submitting || !logValue) && { opacity: 0.4 }]}
                >
                  <Text style={styles.submitBtnText}>
                    {lang === "fr" ? "Enregistrer" : lang === "nl" ? "Opslaan" : "Save"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : challenge.status === "active" && daysLeft > 0 ? (
          <Pressable style={styles.joinBtn} onPress={join}>
            <Text style={styles.joinBtnText}>{t("challenges_join")}</Text>
          </Pressable>
        ) : null}

        {/* Leaderboard interne */}
        <Text style={styles.lbTitle}>
          {lang === "fr" ? "Classement" : lang === "nl" ? "Ranglijst" : "Leaderboard"}
        </Text>
        {participants.length === 0 ? (
          <Text style={styles.empty}>
            {lang === "fr"
              ? "Aucun participant pour le moment."
              : lang === "nl"
                ? "Nog geen deelnemers."
                : "No participants yet."}
          </Text>
        ) : (
          participants.map((p, idx) => (
            <View
              key={p.id}
              style={[
                styles.lbRow,
                p.user_id === user?.id && { borderColor: COACH_DM_COLORS.gold },
              ]}
            >
              <Text
                style={[
                  styles.lbRank,
                  idx === 0 && { color: COACH_DM_COLORS.gold, fontWeight: "800" },
                ]}
              >
                #{p.rank ?? idx + 1}
              </Text>
              {p.profile.avatar_url ? (
                <Image source={{ uri: p.profile.avatar_url }} style={styles.lbAvatar} />
              ) : (
                <View style={styles.lbAvatarPh}>
                  <Text style={styles.lbAvatarPhText}>
                    {(p.profile.full_name ?? "?").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.lbName} numberOfLines={1}>
                {p.profile.full_name ?? "—"}
              </Text>
              <Text style={styles.lbValue}>
                {formatChallengeMetric(challenge.metric as ChallengeMetric, p.current_value)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: "center" },
  value: { color: COACH_DM_COLORS.gold, fontSize: 22, fontWeight: "800" },
  label: { color: COACH_DM_COLORS.textMuted, fontSize: 11, marginTop: 4, textAlign: "center" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COACH_DM_COLORS.bg },
  cover: { width: "100%", height: 200 },
  body: { padding: 16 },
  title: { color: COACH_DM_COLORS.text, fontSize: 24, fontWeight: "800", marginBottom: 4 },
  metric: { color: COACH_DM_COLORS.gold, fontSize: 14, fontWeight: "700", marginBottom: 12 },
  desc: { color: COACH_DM_COLORS.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 16 },

  statsCard: {
    flexDirection: "row",
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },

  meCard: {
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  meTitle: { color: COACH_DM_COLORS.gold, fontSize: 14, fontWeight: "700", marginBottom: 10 },
  progressBar: { height: 10, backgroundColor: "#1f1f1f", borderRadius: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5 },
  meValue: { color: COACH_DM_COLORS.text, marginTop: 8, fontWeight: "700" },
  meRank: { color: COACH_DM_COLORS.gold, marginTop: 4 },

  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f0f0f",
    padding: 10,
    borderLeftWidth: 4,
    borderRadius: 6,
    marginTop: 12,
  },
  insightIcon: { fontSize: 18, marginRight: 8, fontWeight: "800" },
  insightText: { color: COACH_DM_COLORS.text, fontSize: 13, flex: 1 },

  leaveBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.red,
    alignItems: "center",
  },
  leaveBtnText: { color: COACH_DM_COLORS.red, fontWeight: "700" },

  joinBtn: {
    backgroundColor: COACH_DM_COLORS.gold,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  joinBtnText: { color: COACH_DM_COLORS.bg, fontWeight: "800", fontSize: 16 },

  customLog: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COACH_DM_COLORS.border },
  customTitle: { color: COACH_DM_COLORS.gold, fontWeight: "700", marginBottom: 8 },
  input: {
    backgroundColor: "#1a1a1a",
    color: COACH_DM_COLORS.text,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: COACH_DM_COLORS.gold,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  submitBtnText: { color: COACH_DM_COLORS.bg, fontWeight: "800" },

  lbTitle: { color: COACH_DM_COLORS.gold, fontSize: 18, fontWeight: "800", marginVertical: 12 },
  empty: { color: COACH_DM_COLORS.textMuted, textAlign: "center" },
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  lbRank: { color: COACH_DM_COLORS.textMuted, fontWeight: "700", width: 36 },
  lbAvatar: { width: 32, height: 32, borderRadius: 16, marginHorizontal: 8 },
  lbAvatarPh: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
    backgroundColor: COACH_DM_COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  lbAvatarPhText: { color: COACH_DM_COLORS.bg, fontWeight: "700" },
  lbName: { flex: 1, color: COACH_DM_COLORS.text, fontWeight: "600" },
  lbValue: { color: COACH_DM_COLORS.gold, fontWeight: "800" },
});

export default ChallengeDetailScreen;
