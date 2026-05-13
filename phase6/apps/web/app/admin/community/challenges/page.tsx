// ============================================================
// Coach DM · Phase 6 · Web Admin — Challenges
// /admin/community/challenges
// ============================================================

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  COACH_DM_COLORS,
  computeChallengeDaysLeft,
  formatChallengeMetric,
  type Challenge,
  type ChallengeMetric,
  type ChallengeStatus,
} from "@coachdm/shared/community";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const METRICS: { value: ChallengeMetric; label: string; unit: string }[] = [
  { value: "workouts_count", label: "Nombre de séances", unit: "séances" },
  { value: "total_volume_kg", label: "Volume total (kg)", unit: "kg" },
  { value: "cardio_distance_km", label: "Distance cardio (km)", unit: "km" },
  { value: "cardio_duration_min", label: "Durée cardio (min)", unit: "min" },
  { value: "sleep_hours_avg", label: "Heures de sommeil moy.", unit: "h" },
  { value: "hydration_days_target", label: "Jours objectif hydra", unit: "jours" },
  { value: "habit_streak_days", label: "Jours d'habitudes", unit: "jours" },
  { value: "pr_count", label: "Records personnels", unit: "PR" },
  { value: "custom_metric", label: "Métrique personnalisée", unit: "" },
];

export default function AdminChallengesPage() {
  const [list, setList] = useState<(Challenge & { participants: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetch = async () => {
    const { data } = await supabase
      .from("community_challenges")
      .select("*")
      .order("starts_at", { ascending: false })
      .limit(50);
    const arr = (data ?? []) as Challenge[];
    const withCount = await Promise.all(
      arr.map(async (c) => {
        const { count } = await supabase
          .from("community_challenge_participants")
          .select("id", { count: "exact", head: true })
          .eq("challenge_id", c.id);
        return { ...c, participants: count ?? 0 };
      }),
    );
    setList(withCount);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

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
        <h1 style={{ color: COACH_DM_COLORS.gold, fontSize: 28, margin: 0 }}>Challenges</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "10px 16px",
            backgroundColor: COACH_DM_COLORS.gold,
            color: COACH_DM_COLORS.bg,
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showForm ? "Annuler" : "+ Créer un challenge"}
        </button>
      </div>

      {showForm && <ChallengeForm onSaved={() => { setShowForm(false); fetch(); }} />}

      {loading ? (
        <p style={{ color: COACH_DM_COLORS.textMuted }}>Chargement…</p>
      ) : list.length === 0 ? (
        <p style={{ color: COACH_DM_COLORS.textMuted }}>Aucun challenge.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/admin/community/challenges/${c.id}`}
              style={{
                textDecoration: "none",
                backgroundColor: "#141414",
                border: `1px solid ${COACH_DM_COLORS.border}`,
                borderRadius: 12,
                padding: 16,
                color: "inherit",
                display: "block",
              }}
            >
              <StatusPill status={c.status} />
              <h3 style={{ color: COACH_DM_COLORS.text, margin: "8px 0 4px" }}>{c.title_fr}</h3>
              <p style={{ color: COACH_DM_COLORS.gold, fontSize: 13, margin: "0 0 12px", fontWeight: 600 }}>
                {METRICS.find((m) => m.value === c.metric)?.label} ·{" "}
                {formatChallengeMetric(c.metric as ChallengeMetric, c.target_value)}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", color: COACH_DM_COLORS.textMuted, fontSize: 12 }}>
                <span>{c.participants} participants</span>
                <span>
                  {computeChallengeDaysLeft(c.ends_at)} j restants
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ChallengeStatus }) {
  const colors: Record<ChallengeStatus, string> = {
    draft: COACH_DM_COLORS.textMuted,
    active: COACH_DM_COLORS.green,
    completed: COACH_DM_COLORS.blue,
    cancelled: COACH_DM_COLORS.red,
  };
  const labels: Record<ChallengeStatus, string> = {
    draft: "Brouillon",
    active: "Actif",
    completed: "Terminé",
    cancelled: "Annulé",
  };
  return (
    <span
      style={{
        padding: "3px 8px",
        borderRadius: 6,
        border: `1px solid ${colors[status]}`,
        color: colors[status],
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
      }}
    >
      {labels[status]}
    </span>
  );
}

function ChallengeForm({ onSaved }: { onSaved: () => void }) {
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleNl, setTitleNl] = useState("");
  const [descFr, setDescFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descNl, setDescNl] = useState("");
  const [metric, setMetric] = useState<ChallengeMetric>("workouts_count");
  const [target, setTarget] = useState("");
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  const [submitting, setSubmitting] = useState(false);

  const save = async () => {
    if (!titleFr || !titleEn || !titleNl || !target) return;
    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from("community_challenges").insert({
      coach_id: user.id,
      created_by: user.id,
      title_fr: titleFr,
      title_en: titleEn,
      title_nl: titleNl,
      description_fr: descFr || null,
      description_en: descEn || null,
      description_nl: descNl || null,
      metric,
      target_value: parseFloat(target),
      unit: METRICS.find((m) => m.value === metric)?.unit ?? null,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "active",
      visibility: "coach",
    });
    setSubmitting(false);
    if (!error) onSaved();
  };

  return (
    <div
      style={{
        backgroundColor: "#141414",
        border: `1px solid ${COACH_DM_COLORS.gold}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <h2 style={{ color: COACH_DM_COLORS.gold, marginTop: 0 }}>Nouveau challenge</h2>

      <Section label="Titre · FR">
        <input value={titleFr} onChange={(e) => setTitleFr(e.target.value)} style={inputStyle} />
      </Section>
      <Section label="Titre · EN">
        <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} style={inputStyle} />
      </Section>
      <Section label="Titre · NL">
        <input value={titleNl} onChange={(e) => setTitleNl(e.target.value)} style={inputStyle} />
      </Section>

      <Section label="Description · FR">
        <textarea
          value={descFr}
          onChange={(e) => setDescFr(e.target.value)}
          style={{ ...inputStyle, minHeight: 50 }}
        />
      </Section>
      <Section label="Description · EN">
        <textarea
          value={descEn}
          onChange={(e) => setDescEn(e.target.value)}
          style={{ ...inputStyle, minHeight: 50 }}
        />
      </Section>
      <Section label="Description · NL">
        <textarea
          value={descNl}
          onChange={(e) => setDescNl(e.target.value)}
          style={{ ...inputStyle, minHeight: 50 }}
        />
      </Section>

      <Section label="Métrique">
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as ChallengeMetric)}
          style={inputStyle}
        >
          {METRICS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Section label="Objectif">
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={inputStyle}
          />
        </Section>
        <Section label="Début">
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            style={inputStyle}
          />
        </Section>
        <Section label="Fin">
          <input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            style={inputStyle}
          />
        </Section>
      </div>

      <button
        onClick={save}
        disabled={submitting}
        style={{
          marginTop: 16,
          padding: "10px 20px",
          backgroundColor: COACH_DM_COLORS.gold,
          color: COACH_DM_COLORS.bg,
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          cursor: "pointer",
          opacity: submitting ? 0.4 : 1,
        }}
      >
        {submitting ? "…" : "Créer le challenge"}
      </button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ color: COACH_DM_COLORS.gold, fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  backgroundColor: "#1a1a1a",
  border: `1px solid ${COACH_DM_COLORS.border}`,
  borderRadius: 8,
  color: COACH_DM_COLORS.text,
  fontSize: 14,
};
