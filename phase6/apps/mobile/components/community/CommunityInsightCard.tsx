// ============================================================
// Coach DM · Phase 6 · CommunityInsightCard
// Composant insight (vert/rouge/bleu/violet) — Phase 6
// ============================================================

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  COACH_DM_COLORS,
  COMMUNITY_TONE_COLORS,
  COMMUNITY_TONE_ICONS,
  type CommunityInsight,
  type Lang,
} from "@coachdm/shared/community";

interface Props {
  insight: CommunityInsight;
  lang: Lang;
}

export function CommunityInsightCard({ insight, lang }: Props) {
  const text =
    lang === "en"
      ? insight.text_en
      : lang === "nl"
        ? insight.text_nl
        : insight.text_fr;
  const color = COMMUNITY_TONE_COLORS[insight.tone];
  const icon = COMMUNITY_TONE_ICONS[insight.tone];

  return (
    <View style={[styles.box, { borderLeftColor: color }]}>
      <Text style={[styles.icon, { color }]}>{icon}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 4,
    borderLeftWidth: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  icon: { fontSize: 18, fontWeight: "800", marginRight: 10 },
  text: { color: COACH_DM_COLORS.text, fontSize: 13, flex: 1, lineHeight: 19 },
});

export default CommunityInsightCard;
