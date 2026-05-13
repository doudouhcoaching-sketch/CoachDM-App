// ============================================================
// Coach DM · Phase 6 · Edge Function
// community-daily-jobs
// ============================================================
// Endpoint orchestrateur des jobs community.
// Peut être déclenché par un cron externe (Supabase Scheduler)
// ou manuellement par le coach via le web admin.
//
// Actions :
//   - expire_stories       : marque les stories non-featured arrivées à terme
//   - refresh_leaderboards : recalcule classements pour coach (ou all)
//   - recompute_challenges : recalcule progression challenges actifs
//   - push_notifications   : envoie via Expo Push les notifs non poussées
//
// POST body : { action: string, coach_id?: string }
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type NotifKind =
  | "new_comment"
  | "new_reaction"
  | "story_featured"
  | "new_challenge"
  | "challenge_completed"
  | "challenge_invited"
  | "leaderboard_top3"
  | "post_flagged";

interface PushTicket {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  channelId?: string;
}

function pickLang(lang: string | null | undefined): "fr" | "en" | "nl" {
  const l = (lang ?? "fr").toLowerCase().slice(0, 2);
  if (l === "en") return "en";
  if (l === "nl") return "nl";
  return "fr";
}

async function pushPendingNotifications(): Promise<{ sent: number; failed: number }> {
  // Récupère les 200 notifs les plus anciennes non poussées
  const { data: notifs, error } = await supabase
    .from("community_notifications")
    .select("id, user_id, kind, title_fr, title_en, title_nl, body_fr, body_en, body_nl, ref_table, ref_id")
    .is("pushed_at", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("Fetch notifs error:", error);
    return { sent: 0, failed: 0 };
  }
  if (!notifs || notifs.length === 0) return { sent: 0, failed: 0 };

  // Récupère expo_push_token + language pour chaque user
  const userIds = [...new Set(notifs.map((n) => n.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, expo_push_token, language")
    .in("id", userIds);

  const tokenMap = new Map<string, { token: string | null; lang: string | null }>();
  (profiles ?? []).forEach((p) =>
    tokenMap.set(p.id, { token: p.expo_push_token, lang: p.language }),
  );

  // Construit les tickets push
  const tickets: PushTicket[] = [];
  const notifIds: string[] = [];
  const skippedIds: string[] = [];

  for (const n of notifs) {
    const userInfo = tokenMap.get(n.user_id);
    if (!userInfo?.token) {
      skippedIds.push(n.id);
      continue;
    }
    const lang = pickLang(userInfo.lang);
    const title = lang === "en" ? n.title_en : lang === "nl" ? n.title_nl : n.title_fr;
    const body =
      lang === "en" ? n.body_en ?? "" : lang === "nl" ? n.body_nl ?? "" : n.body_fr ?? "";

    tickets.push({
      to: userInfo.token,
      title,
      body,
      data: { kind: n.kind, ref_table: n.ref_table, ref_id: n.ref_id },
      sound: "default",
      channelId: "community",
    });
    notifIds.push(n.id);
  }

  // Marquer skipped comme pushed (token absent) pour ne pas réessayer indéfiniment
  if (skippedIds.length > 0) {
    await supabase
      .from("community_notifications")
      .update({ pushed_at: new Date().toISOString() })
      .in("id", skippedIds);
  }

  if (tickets.length === 0) return { sent: 0, failed: skippedIds.length };

  // Expo accepte jusqu'à 100 par requête
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < tickets.length; i += 100) {
    const batch = tickets.slice(i, i + 100);
    const idsBatch = notifIds.slice(i, i + 100);
    try {
      const resp = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
      if (!resp.ok) {
        console.error("Expo push HTTP error", resp.status);
        failed += batch.length;
        continue;
      }
      await resp.json();
      await supabase
        .from("community_notifications")
        .update({ pushed_at: new Date().toISOString() })
        .in("id", idsBatch);
      sent += batch.length;
    } catch (e) {
      console.error("Expo push error", e);
      failed += batch.length;
    }
  }

  return { sent, failed };
}

async function expireStories(): Promise<number> {
  const { data, error } = await supabase.rpc("fn_expire_stories");
  if (error) {
    console.error("expire stories error", error);
    return 0;
  }
  return Array.isArray(data) ? data.length : 0;
}

async function refreshLeaderboards(coachId?: string): Promise<number> {
  if (coachId) {
    const { error } = await supabase.rpc("fn_refresh_leaderboards_for_coach", {
      p_coach_id: coachId,
    });
    if (error) {
      console.error("refresh leaderboard coach error", error);
      return 0;
    }
    return 1;
  }
  const { data, error } = await supabase.rpc("fn_refresh_leaderboards_all");
  if (error) {
    console.error("refresh leaderboards all error", error);
    return 0;
  }
  return data ?? 0;
}

async function recomputeChallenges(): Promise<number> {
  const { data, error } = await supabase.rpc("fn_recompute_active_challenges");
  if (error) {
    console.error("recompute challenges error", error);
    return 0;
  }
  return data ?? 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: { action?: string; coach_id?: string };
  try {
    body = await req.json();
  } catch {
    body = { action: "all" };
  }

  const action = body.action ?? "all";
  const result: Record<string, unknown> = { action, ranAt: new Date().toISOString() };

  try {
    if (action === "expire_stories" || action === "all") {
      result.stories_expired = await expireStories();
    }
    if (action === "refresh_leaderboards" || action === "all") {
      result.coaches_refreshed = await refreshLeaderboards(body.coach_id);
    }
    if (action === "recompute_challenges" || action === "all") {
      result.challenges_recomputed = await recomputeChallenges();
    }
    if (action === "push_notifications" || action === "all") {
      const push = await pushPendingNotifications();
      result.push_sent = push.sent;
      result.push_failed = push.failed;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("community-daily-jobs error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
