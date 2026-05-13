// ============================================================
// Coach DM · Phase 6 · Web Admin — Feed Moderation
// /admin/community/feed
// ============================================================

"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  COACH_DM_COLORS,
  REACTION_EMOJIS,
  REACTION_ORDER,
  type CommunityPostWithAuthor,
  type ReactionKind,
} from "@coachdm/shared/community";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type ModFilter = "all" | "visible" | "flagged" | "hidden";

export default function AdminCommunityFeedPage() {
  const [posts, setPosts] = useState<CommunityPostWithAuthor[]>([]);
  const [filter, setFilter] = useState<ModFilter>("flagged");
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("community_posts")
      .select(
        `*, author:profiles!community_posts_author_id_fkey ( id, full_name, avatar_url )`,
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    const list = (data ?? []) as CommunityPostWithAuthor[];
    setPosts(list);

    // Fetch report counts par post
    if (list.length > 0) {
      const ids = list.map((p) => p.id);
      const { data: reports } = await supabase
        .from("community_reports")
        .select("post_id, status")
        .in("post_id", ids)
        .eq("status", "pending");
      const counts: Record<string, number> = {};
      (reports ?? []).forEach((r: any) => {
        if (r.post_id) counts[r.post_id] = (counts[r.post_id] ?? 0) + 1;
      });
      setReportCounts(counts);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const moderate = async (postId: string, status: "visible" | "hidden" | "removed") => {
    await supabase
      .from("community_posts")
      .update({
        status,
        hidden_at: status !== "visible" ? new Date().toISOString() : null,
      })
      .eq("id", postId);
    // Dismiss reports
    if (status !== "visible") {
      await supabase
        .from("community_reports")
        .update({ status: "reviewed", reviewed_at: new Date().toISOString() })
        .eq("post_id", postId)
        .eq("status", "pending");
    } else {
      await supabase
        .from("community_reports")
        .update({ status: "dismissed", reviewed_at: new Date().toISOString() })
        .eq("post_id", postId)
        .eq("status", "pending");
    }
    fetch();
  };

  return (
    <div style={{ backgroundColor: COACH_DM_COLORS.bg, minHeight: "100vh", padding: 24 }}>
      <h1 style={{ color: COACH_DM_COLORS.gold, fontSize: 28, marginBottom: 16 }}>
        Modération Feed
      </h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["flagged", "visible", "hidden", "all"] as ModFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: `1px solid ${filter === f ? COACH_DM_COLORS.gold : COACH_DM_COLORS.border}`,
              backgroundColor: filter === f ? COACH_DM_COLORS.gold : "transparent",
              color: filter === f ? COACH_DM_COLORS.bg : COACH_DM_COLORS.textMuted,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {f === "flagged" ? "Signalés" : f === "visible" ? "Visibles" : f === "hidden" ? "Masqués" : "Tous"}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: COACH_DM_COLORS.textMuted }}>Chargement…</p>
      ) : posts.length === 0 ? (
        <p style={{ color: COACH_DM_COLORS.textMuted }}>Aucun post.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {posts.map((p) => (
            <PostModCard
              key={p.id}
              post={p}
              reportCount={reportCounts[p.id] ?? 0}
              onModerate={moderate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostModCard({
  post,
  reportCount,
  onModerate,
}: {
  post: CommunityPostWithAuthor;
  reportCount: number;
  onModerate: (id: string, status: "visible" | "hidden" | "removed") => void;
}) {
  const statusColor =
    post.status === "visible"
      ? COACH_DM_COLORS.green
      : post.status === "flagged"
        ? COACH_DM_COLORS.gold
        : COACH_DM_COLORS.red;

  return (
    <div
      style={{
        backgroundColor: "#141414",
        borderRadius: 12,
        padding: 16,
        border: `1px solid ${COACH_DM_COLORS.border}`,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 16,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 6,
              border: `1px solid ${statusColor}`,
              color: statusColor,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {post.status}
          </span>
          {reportCount > 0 && (
            <span style={{ color: COACH_DM_COLORS.red, fontSize: 12, fontWeight: 700 }}>
              ⚠ {reportCount} signalement{reportCount > 1 ? "s" : ""}
            </span>
          )}
          <span style={{ color: COACH_DM_COLORS.textMuted, fontSize: 12 }}>
            {new Date(post.created_at).toLocaleString("fr-BE")}
          </span>
        </div>

        <div style={{ color: COACH_DM_COLORS.gold, fontWeight: 700, marginBottom: 4 }}>
          {post.author.full_name ?? "—"}
        </div>
        <div style={{ color: COACH_DM_COLORS.text, fontSize: 14, marginBottom: 8 }}>
          {post.content ?? "—"}
        </div>
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt=""
            style={{ maxWidth: 200, borderRadius: 8, marginBottom: 8 }}
          />
        )}

        <div style={{ display: "flex", gap: 12, color: COACH_DM_COLORS.textMuted, fontSize: 12 }}>
          <span>💬 {post.comments_count}</span>
          <span>🔥 {post.reactions_count}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {post.status !== "visible" && (
          <button
            onClick={() => onModerate(post.id, "visible")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              backgroundColor: COACH_DM_COLORS.green,
              color: COACH_DM_COLORS.bg,
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Rétablir
          </button>
        )}
        {post.status === "visible" || post.status === "flagged" ? (
          <button
            onClick={() => onModerate(post.id, "hidden")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              backgroundColor: "transparent",
              border: `1px solid ${COACH_DM_COLORS.gold}`,
              color: COACH_DM_COLORS.gold,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Masquer
          </button>
        ) : null}
        <button
          onClick={() => onModerate(post.id, "removed")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            backgroundColor: "transparent",
            border: `1px solid ${COACH_DM_COLORS.red}`,
            color: COACH_DM_COLORS.red,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
