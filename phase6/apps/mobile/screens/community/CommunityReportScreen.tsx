// ============================================================
// Coach DM · Phase 6 · ReportScreen
// Signaler un post → bascule en flagged si 3+ reports
// ============================================================

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { COACH_DM_COLORS, tCommunity, type Lang, type ReportReason } from "@coachdm/shared/community";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLang } from "../../lib/useLang";

const REASONS: ReportReason[] = ["spam", "inappropriate", "harassment", "misinformation", "other"];

export function CommunityReportScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const postId: string | undefined = route.params?.postId;
  const commentId: string | undefined = route.params?.commentId;
  const { user } = useAuth();
  const lang: Lang = useLang();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const t = useCallback((k: any) => tCommunity(lang, k), [lang]);

  const submit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    const { error } = await supabase.from("community_reports").insert({
      post_id: postId ?? null,
      comment_id: commentId ?? null,
      reporter_id: user.id,
      reason,
      details: details || null,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    Alert.alert(
      lang === "fr" ? "Merci" : lang === "nl" ? "Bedankt" : "Thanks",
      t("report_sent"),
      [{ text: "OK", onPress: () => navigation.goBack() }],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingTop: 56 }}>
      <Text style={styles.title}>{t("report_title")}</Text>
      <Text style={styles.label}>{t("report_reason")}</Text>

      {REASONS.map((r) => (
        <Pressable
          key={r}
          style={[styles.reasonRow, reason === r && styles.reasonRowActive]}
          onPress={() => setReason(r)}
        >
          <View style={[styles.radio, reason === r && { backgroundColor: COACH_DM_COLORS.gold }]} />
          <Text style={styles.reasonText}>{t(`report_${r}`)}</Text>
        </Pressable>
      ))}

      <Text style={styles.label}>{t("report_details")}</Text>
      <TextInput
        value={details}
        onChangeText={setDetails}
        multiline
        style={styles.input}
        placeholder=" "
        placeholderTextColor={COACH_DM_COLORS.textMuted}
      />

      <Pressable
        style={[styles.submit, (!reason || submitting) && { opacity: 0.4 }]}
        disabled={!reason || submitting}
        onPress={submit}
      >
        {submitting ? (
          <ActivityIndicator color={COACH_DM_COLORS.bg} />
        ) : (
          <Text style={styles.submitText}>{t("report_send")}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  title: { color: COACH_DM_COLORS.gold, fontSize: 22, fontWeight: "800", marginBottom: 16 },
  label: { color: COACH_DM_COLORS.text, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#141414",
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  reasonRowActive: { borderColor: COACH_DM_COLORS.gold },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COACH_DM_COLORS.gold,
    marginRight: 10,
  },
  reasonText: { color: COACH_DM_COLORS.text, fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: "#1a1a1a",
    color: COACH_DM_COLORS.text,
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 14,
  },
  submit: {
    marginTop: 16,
    backgroundColor: COACH_DM_COLORS.gold,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: { color: COACH_DM_COLORS.bg, fontWeight: "800", fontSize: 15 },
});

export default CommunityReportScreen;
