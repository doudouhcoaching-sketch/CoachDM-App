// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Mobile · InsightCard
// ═══════════════════════════════════════════════════════════════════════════
// Code couleur Coach DM :
//   ✓ vert (insight)  · ✗ rouge (warning) · ⓘ bleu (info) · ⚑ violet (tactic)
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../lib/theme';
import type { RecoveryInsight, InsightLevel } from '@coachdm/shared/recovery';

const STYLES_BY_LEVEL: Record<InsightLevel, { color: string; symbol: string }> = {
  insight: { color: '#10B981', symbol: '✓' },
  warning: { color: '#EF4444', symbol: '✗' },
  info:    { color: '#38BDF8', symbol: 'ⓘ' },
  tactic:  { color: '#A78BFA', symbol: '⚑' },
};

export function InsightCard({ insight }: { insight: RecoveryInsight }) {
  const conf = STYLES_BY_LEVEL[insight.level];
  return (
    <View style={[styles.card, { borderLeftColor: conf.color }]}>
      <View style={styles.row}>
        <Text style={[styles.symbol, { color: conf.color }]}>{conf.symbol}</Text>
        <View style={styles.body}>
          <Text style={[styles.title, { color: conf.color }]}>{insight.title}</Text>
          <Text style={styles.message}>{insight.message}</Text>
          {insight.source && (
            <Text style={styles.source}>— {insight.source}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 10 },
  symbol: { fontSize: 18, fontWeight: '900', width: 20, textAlign: 'center' },
  body: { flex: 1 },
  title: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  message: { color: theme.text, fontSize: 13, lineHeight: 18 },
  source: { color: theme.muted, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
});
