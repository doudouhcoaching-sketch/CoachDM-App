// ============================================================
// Coach DM · Phase 6 · Web Admin — Challenge Detail
// /admin/community/challenges/[id]
// ============================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  COACH_DM_COLORS,
  computeChallengeDaysLeft,
  formatChallengeMetric,
  type Challenge,
  type ChallengeMetric,
  type ChallengeParticipantWithProfile,
} from "@coachdm/shared/community";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AdminChallengeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<ChallengeParticipantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data: c } = await supabase
      .from("community_challenges")
      .select("*")
      .eq("id", id)
      .single();
    setChallenge((c as Challenge) ?? null);

    const { data: parts } = await supabase
      .from("community_challenge_participants")
      .select(
        `*, profile:profiles!community_challenge_participants_user_id_fkey ( id, full_name, avatar_url )`,
      )
      .eq("challenge_id", id)
      .order("current_value", { ascending: false });
    setParticipants((parts ?? []) as ChallengeParticipantWithProfile[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const recompute = async () => {
    setRecomputing(true);
    await supabase.rpc("fn_recompute_challenge_all", { p_challenge_id: id });
    await fetch();
    setRecomputing(false);
  };

  const updateStatus = async (status: Challenge["status"]) => {
    await supabase.from("community_challenges").update({ status }).eq("id", id);
    fetch();
  };

  if (loading || !challenge) {
    return (
      <div style={{ backgroundColor: COACH_DM_COLORS.bg, minHeight: "100vh", padding: 24, color: COACH_DM_COLORS.textMuted }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: COACH_DM_COLORS.bg, minHeight: "100vh", padding: 24 }}>
      <h1 style={{ color: COACH_DM_COLORS.gold, fontSize: 28, margin: "0 0 8px" }}>
        {challenge.title_fr}
      </h1>
      <p style={{ color: COACH_DM_COLORS.textMuted, margin: "0 0 16px" }}>
        EN: {challenge.title_en} · NL: {challenge.title_nl}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Stat label="Métrique" value={challenge.metric} />
        <Stat
          label="Objectif"
          value={formatChallengeMetric(challenge.metric as ChallengeMetric, challenge.target_value)}
        />
        <Stat
          label="Jours restants"
          value={`${computeChallengeDaysLeft(challenge.ends_at)}`}
        />
        <Stat label="Participants" value={`${participants.length}`} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          onClick={recompute}
          disabled={recomputing}
          style={btnStyle(COACH_DM_COLORS.gold)}
        >
          {recomputing ? "…" : "↻ Recalculer la progression"}
        </button>
        {challenge.status === "active" && (
          <button onClick={() => updateStatus("cancelled")} style={btnStyle(COACH_DM_COLORS.red, true)}>
            Annuler le challenge
          </button>
        )}
        {challenge.status === "draft" && (
          <button onClick={() => updateStatus("active")} style={btnStyle(COACH_DM_COLORS.green)}>
            Activer
          </button>
        )}
      </div>

      <h2 style={{ color: COACH_DM_COLORS.gold }}>Classement</h2>
      {participants.length === 0 ? (
        <p style={{ color: COACH_DM_COLORS.textMuted }}>Aucun participant.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: COACH_DM_COLORS.textMuted, textAlign: "left" }}>
              <th style={th}>#</th>
              <th style={th}>Participant</th>
              <th style={th}>Valeur</th>
              <th style={th}>Progression</th>
              <th style={th}>Terminé</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, idx) => (
              <tr
                key={p.id}
                style={{ borderBottom: `1px solid ${COACH_DM_COLORS.border}`, color: COACH_DM_COLORS.text }}
              >
                <td style={td}>
                  <span
                    style={{
                      color: (p.rank ?? idx + 1) <= 3 ? COACH_DM_COLORS.gold : COACH_DM_COLORS.textMuted,
                      fontWeight: 700,
                    }}
                  >
                    #{p.rank ?? idx + 1}
                  </span>
                </td>
                <td style={td}>{p.profile.full_name ?? "—"}</td>
                <td style={td}>
                  {formatChallengeMetric(challenge.metric as ChallengeMetric, p.current_value)}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, backgroundColor: "#1f1f1f", borderRadius: 3 }}>
                      <div
                        style={{
                          width: `${Math.min(100, p.progress_pct)}%`,
                          height: "100%",
                          backgroundColor:
                            p.progress_pct >= 100 ? COACH_DM_COLORS.green : COACH_DM_COLORS.gold,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <span style={{ width: 50, color: COACH_DM_COLORS.textMuted, fontSize: 12 }}>
                      {p.progress_pct}%
                    </span>
                  </div>
                </td>
                <td style={td}>
                  {p.completed_at ? (
                    <span style={{ color: COACH_DM_COLORS.green }}>✓</span>
                  ) : (
                    <span style={{ color: COACH_DM_COLORS.textMuted }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        backgroundColor: "#141414",
        border: `1px solid ${COACH_DM_COLORS.border}`,
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ color: COACH_DM_COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ color: COACH_DM_COLORS.gold, fontSize: 22, fontWeight: 800, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

const btnStyle = (color: string, outline = false): React.CSSProperties => ({
  padding: "10px 14px",
  borderRadius: 8,
  backgroundColor: outline ? "transparent" : color,
  color: outline ? color : COACH_DM_COLORS.bg,
  border: outline ? `1px solid ${color}` : "none",
  fontWeight: 700,
  cursor: "pointer",
});

const th: React.CSSProperties = { padding: 10, fontSize: 12, fontWeight: 700 };
const td: React.CSSProperties = { padding: 10, fontSize: 14 };
