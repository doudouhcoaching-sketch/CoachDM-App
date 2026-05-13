'use client';

// =====================================================================
// Coach DM · Phase 5 · ClientProgressionView (client-side)
// Charts Recharts + heatmap GitHub + recompute action
// =====================================================================

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  computePlateauDetection,
  formatPRValue,
  formatDate,
  CALENDAR_INTENSITY_COLORS,
  COACH_DM_COLORS,
  type Locale,
  type BodyMetric,
  type PersonalRecord,
  type DailyActivity,
  type BodyMetricsWeekly,
} from '@coachdm/shared/progression';

interface Props {
  clientId: string;
  metrics: BodyMetric[];
  prs: PersonalRecord[];
  activities: DailyActivity[];
  weekly: BodyMetricsWeekly[];
  locale: Locale;
}

export function ClientProgressionView({ clientId, metrics, prs, activities, weekly, locale }: Props) {
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMsg, setRecomputeMsg] = useState<string | null>(null);

  const weightData = useMemo(
    () =>
      metrics
        .filter((m) => m.weight_kg !== null)
        .map((m) => ({
          date: m.measured_date,
          weight: m.weight_kg,
        })),
    [metrics]
  );

  const waistData = useMemo(
    () =>
      metrics
        .filter((m) => m.waist_cm !== null)
        .map((m) => ({
          date: m.measured_date,
          waist: m.waist_cm,
        })),
    [metrics]
  );

  const plateau = useMemo(() => computePlateauDetection(weekly), [weekly]);

  const totalWorkouts = activities.reduce((s, a) => s + a.workout_count, 0);
  const totalCardio = activities.reduce((s, a) => s + a.cardio_count, 0);
  const activeDays = activities.filter((a) => a.intensity > 0).length;

  const recompute = async () => {
    setRecomputing(true);
    setRecomputeMsg(null);
    try {
      const res = await fetch('/api/progression/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: clientId }),
      });
      const j = await res.json();
      if (j.ok) setRecomputeMsg('✓ Recalcul terminé');
      else setRecomputeMsg(`✗ ${j.error ?? 'Erreur'}`);
    } catch (e: any) {
      setRecomputeMsg(`✗ ${e.message}`);
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div>
      {/* KPI cards */}
      <div style={kpiRowStyle}>
        <div style={kpiStyle}>
          <div style={kpiLabelStyle}>Jours actifs (90j)</div>
          <div
            style={{
              ...kpiValueStyle,
              color: activeDays >= 60 ? '#10B981' : activeDays >= 30 ? '#D4AF37' : '#EF4444',
            }}
          >
            {activeDays}/90
          </div>
        </div>
        <div style={kpiStyle}>
          <div style={kpiLabelStyle}>Séances</div>
          <div style={kpiValueStyle}>{totalWorkouts}</div>
        </div>
        <div style={kpiStyle}>
          <div style={kpiLabelStyle}>Cardio</div>
          <div style={kpiValueStyle}>{totalCardio}</div>
        </div>
        <div style={kpiStyle}>
          <div style={kpiLabelStyle}>PRs total</div>
          <div style={kpiValueStyle}>{prs.length}</div>
        </div>
      </div>

      {/* Plateau warning */}
      {plateau.is_plateau && plateau.recommendation ? (
        <div style={plateauBoxStyle(plateau.recommendation.kind)}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ fontSize: 20 }}>{plateau.recommendation.icon}</div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {plateau.recommendation.title[locale]}
              </div>
              <div style={{ fontSize: 13, color: '#FFF' }}>
                {plateau.recommendation.body[locale]}
              </div>
              {plateau.recommendation.source ? (
                <div style={{ color: '#A1A1AA', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                  {plateau.recommendation.source}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Weight chart */}
      <Section title="Poids (90 derniers jours)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={weightData}>
            <CartesianGrid stroke={COACH_DM_COLORS.border} strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: '#A1A1AA', fontSize: 11 }} />
            <YAxis
              domain={['dataMin - 1', 'dataMax + 1']}
              tick={{ fill: '#A1A1AA', fontSize: 11 }}
              unit=" kg"
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#171717', border: '1px solid #27272A' }}
              labelStyle={{ color: '#A1A1AA' }}
              itemStyle={{ color: '#D4AF37' }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke={COACH_DM_COLORS.gold}
              strokeWidth={2}
              dot={{ fill: COACH_DM_COLORS.gold, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* Waist chart */}
      {waistData.length > 0 ? (
        <Section title="Taille (90 derniers jours)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={waistData}>
              <CartesianGrid stroke={COACH_DM_COLORS.border} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: '#A1A1AA', fontSize: 11 }} />
              <YAxis
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fill: '#A1A1AA', fontSize: 11 }}
                unit=" cm"
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#171717', border: '1px solid #27272A' }}
                labelStyle={{ color: '#A1A1AA' }}
                itemStyle={{ color: '#38BDF8' }}
              />
              <Line
                type="monotone"
                dataKey="waist"
                stroke={COACH_DM_COLORS.blue}
                strokeWidth={2}
                dot={{ fill: COACH_DM_COLORS.blue, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Section>
      ) : null}

      {/* Activity heatmap */}
      <Section title="Calendrier d'activité (90 derniers jours)">
        <ActivityGrid activities={activities} days={90} />
      </Section>

      {/* PRs */}
      <Section title={`Records personnels (${prs.length})`}>
        {prs.length === 0 ? (
          <p style={{ color: '#A1A1AA' }}>Aucun PR enregistré.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {prs.slice(0, 15).map((pr) => (
              <div
                key={`${pr.category}-${pr.exercise_id ?? pr.activity_type ?? 'body'}`}
                style={prRowStyle}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#A1A1AA', fontSize: 11, textTransform: 'uppercase' }}>
                    {pr.category}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {pr.exercise_name ?? pr.activity_type ?? '—'}
                  </div>
                  <div style={{ color: '#A1A1AA', fontSize: 11 }}>
                    {formatDate(pr.achieved_at, locale)}
                  </div>
                </div>
                <div style={{ color: '#D4AF37', fontSize: 18, fontWeight: 800 }}>
                  {formatPRValue(pr.category, pr.value, pr.unit)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recompute action */}
      <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #27272A' }}>
        <button
          onClick={recompute}
          disabled={recomputing}
          style={{
            padding: '12px 24px',
            backgroundColor: COACH_DM_COLORS.cardBg,
            color: COACH_DM_COLORS.gold,
            border: `1px solid ${COACH_DM_COLORS.gold}`,
            borderRadius: 8,
            cursor: recomputing ? 'wait' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {recomputing ? 'Recalcul…' : 'Recalculer les PRs depuis l\'historique'}
        </button>
        {recomputeMsg ? (
          <span style={{ marginLeft: 12, color: '#A1A1AA', fontSize: 13 }}>{recomputeMsg}</span>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 28 }}>
      <h2
        style={{
          color: COACH_DM_COLORS.gold,
          fontSize: 16,
          fontWeight: 700,
          borderLeft: `3px solid ${COACH_DM_COLORS.gold}`,
          paddingLeft: 10,
          margin: '0 0 12px',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          backgroundColor: COACH_DM_COLORS.cardBg,
          padding: 16,
          borderRadius: 10,
          border: `1px solid ${COACH_DM_COLORS.border}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ActivityGrid({ activities, days }: { activities: DailyActivity[]; days: number }) {
  const map = new Map<string, DailyActivity>();
  activities.forEach((a) => map.set(a.day, a));

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  start.setDate(start.getDate() - start.getDay());

  const weeks: { date: string; intensity: 0 | 1 | 2 | 3 | 4 }[][] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const week: { date: string; intensity: 0 | 1 | 2 | 3 | 4 }[] = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const found = map.get(dateStr);
      week.push({ date: dateStr, intensity: (found?.intensity ?? 0) as any });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 3, paddingBottom: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map((cell, di) => (
              <div
                key={di}
                title={`${cell.date} · niveau ${cell.intensity}`}
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 2,
                  backgroundColor: CALENDAR_INTENSITY_COLORS[cell.intensity],
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 10 }}>
        <span style={{ color: '#A1A1AA', fontSize: 11 }}>Moins</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div
            key={l}
            style={{
              width: 13,
              height: 13,
              borderRadius: 2,
              backgroundColor: CALENDAR_INTENSITY_COLORS[l as 0 | 1 | 2 | 3 | 4],
            }}
          />
        ))}
        <span style={{ color: '#A1A1AA', fontSize: 11 }}>Plus</span>
      </div>
    </div>
  );
}

const kpiRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 12,
  marginBottom: 20,
};
const kpiStyle: React.CSSProperties = {
  backgroundColor: '#171717',
  padding: 14,
  borderRadius: 10,
  border: '1px solid #27272A',
};
const kpiLabelStyle: React.CSSProperties = {
  color: '#A1A1AA',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};
const kpiValueStyle: React.CSSProperties = { color: '#FFF', fontSize: 22, fontWeight: 700, marginTop: 4 };

const plateauBoxStyle = (kind: string): React.CSSProperties => ({
  padding: 14,
  borderRadius: 8,
  marginBottom: 16,
  backgroundColor: '#171717',
  borderLeft: `3px solid ${
    kind === 'warning' ? '#EF4444' : kind === 'insight' ? '#10B981' : kind === 'tactic' ? '#A78BFA' : '#38BDF8'
  }`,
});

const prRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 12,
  backgroundColor: '#0A0A0A',
  borderRadius: 6,
};
