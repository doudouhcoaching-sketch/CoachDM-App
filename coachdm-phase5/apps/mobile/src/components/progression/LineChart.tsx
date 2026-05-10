// =====================================================================
// Coach DM · Phase 5 · LineChart (mobile, Skia-powered)
// Performance native, ne dépend pas de SVG lourd
// =====================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Path, Skia, Circle, Line, Group, Text as SkText, useFont } from '@shopify/react-native-skia';
import { COACH_DM_COLORS } from '@coachdm/shared/progression';

interface DataPoint {
  x: number;     // timestamp ms ou index
  y: number;     // valeur
  label?: string;
}

interface Props {
  data: DataPoint[];
  height?: number;
  color?: string;
  yLabel?: string;
  /** Format de la valeur (ex: 1 décimale) */
  formatY?: (v: number) => string;
}

export function LineChart({
  data,
  height = 220,
  color = COACH_DM_COLORS.gold,
  yLabel,
  formatY = (v) => v.toFixed(1),
}: Props) {
  const screenW = Dimensions.get('window').width;
  const width = screenW - 32; // 16px padding chaque côté
  const padding = { top: 20, right: 16, bottom: 30, left: 40 };

  const { path, points, yMin, yMax, dotPositions } = useMemo(() => {
    if (data.length === 0) {
      return { path: null, points: [], yMin: 0, yMax: 1, dotPositions: [] };
    }

    const xs = data.map((d) => d.x);
    const ys = data.map((d) => d.y);
    const xMinV = Math.min(...xs);
    const xMaxV = Math.max(...xs);
    const yMinV = Math.min(...ys);
    const yMaxV = Math.max(...ys);

    const yRange = yMaxV - yMinV || 1;
    const yPadded = yRange * 0.1;
    const yLow = yMinV - yPadded;
    const yHigh = yMaxV + yPadded;

    const xScale = (x: number) =>
      padding.left + ((x - xMinV) / Math.max(xMaxV - xMinV, 1)) * (width - padding.left - padding.right);
    const yScale = (y: number) =>
      padding.top + (1 - (y - yLow) / (yHigh - yLow)) * (height - padding.top - padding.bottom);

    const sk = Skia.Path.Make();
    const dots: { cx: number; cy: number }[] = [];

    data.forEach((d, i) => {
      const cx = xScale(d.x);
      const cy = yScale(d.y);
      if (i === 0) sk.moveTo(cx, cy);
      else sk.lineTo(cx, cy);
      dots.push({ cx, cy });
    });

    return {
      path: sk,
      points: data,
      yMin: yLow,
      yMax: yHigh,
      dotPositions: dots,
    };
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>—</Text>
      </View>
    );
  }

  // Lignes de grille horizontales (4)
  const gridLines = [0.25, 0.5, 0.75, 1].map((p) => ({
    y: padding.top + p * (height - padding.top - padding.bottom),
    label: yMax - p * (yMax - yMin),
  }));

  return (
    <View style={[styles.container, { height }]}>
      <Canvas style={{ width, height }}>
        {/* Grille */}
        <Group>
          {gridLines.map((g, i) => (
            <Line
              key={i}
              p1={{ x: padding.left, y: g.y }}
              p2={{ x: width - padding.right, y: g.y }}
              color={COACH_DM_COLORS.border}
              strokeWidth={0.5}
            />
          ))}
        </Group>
        {/* Ligne principale */}
        {path ? (
          <Path path={path} color={color} style="stroke" strokeWidth={2.5} />
        ) : null}
        {/* Points */}
        <Group>
          {dotPositions.map((p, i) => (
            <Circle key={i} cx={p.cx} cy={p.cy} r={3} color={color} />
          ))}
        </Group>
      </Canvas>
      {/* Labels Y axis (overlay) */}
      <View style={[styles.yAxis, { height }]} pointerEvents="none">
        {gridLines.map((g, i) => (
          <Text
            key={i}
            style={[
              styles.yLabel,
              { top: g.y - 7 },
            ]}
          >
            {formatY(g.label)}
          </Text>
        ))}
      </View>
      {yLabel ? <Text style={styles.yTitle}>{yLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  empty: {
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { color: COACH_DM_COLORS.textSecondary, fontSize: 12 },
  yAxis: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
  },
  yLabel: {
    position: 'absolute',
    fontSize: 9,
    color: COACH_DM_COLORS.textSecondary,
    left: 4,
  },
  yTitle: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    fontSize: 10,
    color: COACH_DM_COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
