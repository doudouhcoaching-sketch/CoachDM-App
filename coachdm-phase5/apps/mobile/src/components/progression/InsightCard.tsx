// =====================================================================
// Coach DM · Phase 5 · InsightCard (mobile)
// Code couleur : vert ✓ insight / rouge ✗ warning / bleu ⓘ info / violet ⚑ tactic
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ProgressionInsight, Locale } from '@coachdm/shared/progression';
import { COACH_DM_COLORS } from '@coachdm/shared/progression';

interface Props {
  insight: ProgressionInsight;
  locale?: Locale;
}

const KIND_COLORS: Record<ProgressionInsight['kind'], string> = {
  insight: COACH_DM_COLORS.green,
  warning: COACH_DM_COLORS.red,
  info: COACH_DM_COLORS.blue,
  tactic: COACH_DM_COLORS.violet,
};

export function InsightCard({ insight, locale = 'fr' }: Props) {
  const color = KIND_COLORS[insight.kind];
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.row}>
        <Text style={[styles.icon, { color }]}>{insight.icon}</Text>
        <View style={styles.content}>
          <Text style={[styles.title, { color }]}>{insight.title[locale]}</Text>
          <Text style={styles.body}>{insight.body[locale]}</Text>
          {insight.source ? (
            <Text style={styles.source}>{insight.source}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
  },
  row: { flexDirection: 'row', gap: 10 },
  icon: { fontSize: 18, lineHeight: 22, fontWeight: '700' },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  body: { fontSize: 13, color: COACH_DM_COLORS.textPrimary, lineHeight: 18 },
  source: { fontSize: 11, color: COACH_DM_COLORS.textSecondary, marginTop: 4, fontStyle: 'italic' },
});
