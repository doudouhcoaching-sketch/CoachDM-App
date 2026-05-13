// ============================================================
// Coach DM · Phase 6 · Web Admin — Leaderboards
// /admin/community/leaderboards
// ============================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  COACH_DM_COLORS,
  formatChallengeMetric,
  getCurrentMonthStart,
  getCurrentWeekStart,
  type LeaderboardEntryWithProfile,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from "@coachdm/shared/community";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const METRICS: { value: LeaderboardMetric; label: string }[] = [
  { value: "workouts_count", label: "Séances" },
  { value: "total_volume_kg", label: "Volume (kg)" },
  { value: "cardio_distance_km", label: "Distance (km)" },
  { value: "cardio_duration_min", label: "Durée cardio" },
  { value: "sleep_hours_avg", label: "Sommeil moy." },
  { value: "recovery_score_avg", label: "Recovery score" },
];

export default function AdminLeaderboardsPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [metric, setMetric] = useState<LeaderboardMetric>("workouts_count");
  const [entries, setEntries] = useState<LeaderboardEntryWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const periodStart = useMemo(
    () => (period === "week" ? getCurrentWeekStart() : getCurrentMonthStart()),
    [period],
  );

  const fetch = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("leaderboard_entries")
      .select(
        `*, profile:profiles!leaderboard_entries_user_id_fkey ( id, full_name, avatar_url )`,
      )
      .eq("coach_id", user.id)
      .eq("period", period)
      .eq("period_start", periodStart)
      .eq("metric", metric)
      .order("rank", { ascending: true, nullsFirst: false });
    setEntries((data ?? []) as LeaderboardEntryWithProfile[]);
    setLoading(false);
  }, [period, metric, periodStart]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const refresh = async () => {
    setRefreshing(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc("fn_refresh_leaderboards_for_coach", { p_coach_id: user.id });
      await fetch();
    }
    setRefreshing(false);
  };

  return (
    <div style={{ backgroundColor: COACH_DM_COLORS.bg, minHeight: "100vh", padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ color: COACH_DM_COLORS.gold, fontSize: 28, margin: 0 }}>Classements</h1>
        <button onClick={refresh} disabled={refreshing} style={btnStyle}>
          {refreshing ? "…" : "↻ Rafraîchir maintenant"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["week", "month"] as LeaderboardPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              ...chipStyle,
              backgroundColor: period === p ? COACH_DM_COLORS.gold : "transparent",
              color: period === p ? COACH_DM_COLORS.bg : COACH_DM_COLORS.textMuted,
              border: `1px solid ${period === p ? COACH_DM_COLORS.gold : COACH_DM_COLORS.border}`,
            }}
          >
            {p === "week" ? "Cette semaine" : "Ce mois"}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ color: COACH_DM_COLORS.textMuted, fontSize: 13, alignSelf: "center" }}>
          Du {periodStart}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {METRICS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMetric(m.value)}
            style={{
              ...chipStyle,
              backgroundColor: metric === m.value ? "#141414" : "transparent",
              color: metric === m.value ? COACH_DM_COLORS.gold : COACH_DM_COLORS.textMuted,
              border: `1px solid ${metric === m.value ? COACH_DM_COLORS.gold : COACH_DM_COLORS.border}`,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: COACH_DM_COLORS.textMuted }}>Chargement…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: COACH_DM_COLORS.textMuted }}>
          Aucune donnée pour cette période. Vérifie que les clients ont opt-in.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: COACH_DM_COLORS.textMuted, textAlign: "left" }}>
              <th style={th}>Rang</th>
              <th style={th}>Client</th>
              <th style={th}>Valeur</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, idx) => {
              const r = e.rank ?? idx + 1;
              const top3 = r <= 3;
              return (
                <tr
                  key={e.id}
                  style={{ borderBottom: `1px solid ${COACH_DM_COLORS.border}`, color: COACH_DM_COLORS.text }}
                >
                  <td style={td}>
                    <span style={{ color: top3 ? COACH_DM_COLORS.gold : COACH_DM_COLORS.textMuted, fontWeight: 700 }}>
                      {r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `#${r}`}
                    </span>
                  </td>
                  <td style={td}>{e.profile.full_name ?? "—"}</td>
                  <td style={td}>{formatChallengeMetric(metric as any, e.value)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  backgroundColor: COACH_DM_COLORS.gold,
  color: COACH_DM_COLORS.bg,
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
};

const chipStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const th: React.CSSProperties = { padding: 10, fontSize: 12, fontWeight: 700 };
const td: React.CSSProperties = { padding: 12, fontSize: 14 };
