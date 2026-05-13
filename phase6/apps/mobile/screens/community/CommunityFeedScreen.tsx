// ============================================================
// Coach DM · Phase 6 · CommunityFeedScreen
// Feed principal : posts + réactions + commentaires
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  COACH_DM_COLORS,
  REACTION_EMOJIS,
  REACTION_ORDER,
  tCommunity,
  type CommunityPostWithAuthor,
  type Lang,
  type PostKind,
  type ReactionKind,
} from "@coachdm/shared/community";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLang } from "../../lib/useLang";

type Tab = "for_you" | "mine";

export function CommunityFeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const lang: Lang = useLang();
  const [posts, setPosts] = useState<CommunityPostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("for_you");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [posting, setPosting] = useState(false);

  const t = useCallback((key: any) => tCommunity(lang, key), [lang]);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from("community_posts")
      .select(
        `
        *,
        author:profiles!community_posts_author_id_fkey ( id, full_name, avatar_url ),
        my_reactions:community_reactions!inner ( kind, user_id )
      `,
      )
      .eq("status", "visible")
      .order("created_at", { ascending: false })
      .limit(50);

    if (tab === "mine") {
      query = query.eq("author_id", user.id);
    }

    const { data, error } = await query;
    if (error) {
      // Retry sans la jointure inner (cas zéro réaction)
      const { data: fallback } = await supabase
        .from("community_posts")
        .select(
          `*, author:profiles!community_posts_author_id_fkey ( id, full_name, avatar_url )`,
        )
        .eq("status", "visible")
        .order("created_at", { ascending: false })
        .limit(50);
      setPosts(((fallback ?? []) as any) as CommunityPostWithAuthor[]);
    } else {
      // Compute my_reactions kinds
      const mapped = (data ?? []).map((p: any) => ({
        ...p,
        my_reactions: (p.my_reactions ?? [])
          .filter((r: any) => r.user_id === user.id)
          .map((r: any) => r.kind as ReactionKind),
      }));
      setPosts(mapped as CommunityPostWithAuthor[]);
    }
    setLoading(false);
  }, [user, tab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("community_posts_feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_posts" },
        () => fetchPosts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_reactions" },
        () => fetchPosts(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const sendPost = async () => {
    if (!user || composeText.trim().length === 0) return;
    setPosting(true);
    // On a besoin du coach_id : profile.coach_id ou self si role=coach
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, role, coach_id")
      .eq("id", user.id)
      .single();
    const coachId = prof?.role === "coach" ? prof.id : prof?.coach_id;
    if (!coachId) {
      setPosting(false);
      return;
    }
    const { error } = await supabase.from("community_posts").insert({
      coach_id: coachId,
      author_id: user.id,
      kind: "text" as PostKind,
      content: composeText.trim(),
    });
    if (!error) {
      setComposeText("");
      setComposeOpen(false);
      await fetchPosts();
    }
    setPosting(false);
  };

  const toggleReaction = async (postId: string, kind: ReactionKind) => {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    const has = post?.my_reactions?.includes(kind);
    if (has) {
      await supabase
        .from("community_reactions")
        .delete()
        .match({ post_id: postId, user_id: user.id, kind });
    } else {
      await supabase
        .from("community_reactions")
        .insert({ post_id: postId, user_id: user.id, kind });
    }
    fetchPosts();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COACH_DM_COLORS.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t("feed_title")}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("CommunityNotifications")}
          style={styles.iconBtn}
        >
          <Text style={styles.iconText}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "for_you" && styles.tabActive]}
          onPress={() => setTab("for_you")}
        >
          <Text style={[styles.tabText, tab === "for_you" && styles.tabTextActive]}>
            {t("tab_feed")}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "mine" && styles.tabActive]}
          onPress={() => setTab("mine")}
        >
          <Text style={[styles.tabText, tab === "mine" && styles.tabTextActive]}>
            {lang === "fr" ? "Mes posts" : lang === "nl" ? "Mijn berichten" : "My posts"}
          </Text>
        </Pressable>
      </View>

      {/* Compose */}
      {!composeOpen ? (
        <TouchableOpacity style={styles.composeBtn} onPress={() => setComposeOpen(true)}>
          <Text style={styles.composeBtnText}>+ {t("feed_compose_placeholder")}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.composeBox}>
          <TextInput
            style={styles.composeInput}
            placeholder={t("feed_compose_placeholder")}
            placeholderTextColor={COACH_DM_COLORS.textMuted}
            multiline
            value={composeText}
            onChangeText={setComposeText}
            autoFocus
          />
          <View style={styles.composeActions}>
            <Pressable onPress={() => setComposeOpen(false)} style={styles.btnGhost}>
              <Text style={styles.btnGhostText}>{t("feed_compose_cancel")}</Text>
            </Pressable>
            <Pressable
              onPress={sendPost}
              disabled={posting || composeText.trim().length === 0}
              style={[
                styles.btnPrimary,
                (posting || composeText.trim().length === 0) && { opacity: 0.4 },
              ]}
            >
              <Text style={styles.btnPrimaryText}>{t("feed_compose_send")}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COACH_DM_COLORS.gold}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.empty}>{t("feed_empty")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.id ?? ""}
            lang={lang}
            t={t}
            onReact={(k) => toggleReaction(item.id, k)}
            onComment={() => navigation.navigate("CommunityComments", { postId: item.id })}
            onReport={() => navigation.navigate("CommunityReport", { postId: item.id })}
          />
        )}
      />
    </View>
  );
}

function PostCard({
  post,
  currentUserId,
  lang,
  t,
  onReact,
  onComment,
  onReport,
}: {
  post: CommunityPostWithAuthor;
  currentUserId: string;
  lang: Lang;
  t: (k: any) => string;
  onReact: (k: ReactionKind) => void;
  onComment: () => void;
  onReport: () => void;
}) {
  const isMine = post.author_id === currentUserId;
  const time = useMemo(() => {
    const diffMin = Math.round((Date.now() - new Date(post.created_at).getTime()) / 60000);
    if (diffMin < 1) return lang === "fr" ? "à l'instant" : lang === "nl" ? "nu" : "now";
    if (diffMin < 60) return `${diffMin}m`;
    const h = Math.floor(diffMin / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}j`;
  }, [post.created_at, lang]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        {post.author.avatar_url ? (
          <Image source={{ uri: post.author.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>
              {(post.author.full_name ?? "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>
            {post.author.display_name ?? post.author.full_name ?? "—"}
          </Text>
          <Text style={styles.timeText}>{time}</Text>
        </View>
        <PostKindBadge kind={post.kind} lang={lang} />
      </View>

      {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

      {post.image_url ? (
        <Image source={{ uri: post.image_url }} style={styles.cardImage} resizeMode="cover" />
      ) : null}

      {/* Réactions */}
      <View style={styles.reactionsRow}>
        {REACTION_ORDER.map((k) => {
          const isActive = post.my_reactions?.includes(k);
          return (
            <Pressable
              key={k}
              onPress={() => onReact(k)}
              style={[styles.reactionBtn, isActive && styles.reactionBtnActive]}
            >
              <Text style={styles.reactionEmoji}>{REACTION_EMOJIS[k]}</Text>
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        <Text style={styles.countText}>
          {post.reactions_count} · 💬 {post.comments_count}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Pressable onPress={onComment} style={styles.actionBtn}>
          <Text style={styles.actionText}>{t("feed_comment")}</Text>
        </Pressable>
        {!isMine ? (
          <Pressable onPress={onReport} style={styles.actionBtn}>
            <Text style={styles.actionText}>{t("feed_report")}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PostKindBadge({ kind, lang }: { kind: PostKind; lang: Lang }) {
  if (kind === "text") return null;
  const map: Record<PostKind, { color: string; key: any }> = {
    text: { color: COACH_DM_COLORS.textMuted, key: "kind_text" },
    image: { color: COACH_DM_COLORS.blue, key: "kind_image" },
    workout_share: { color: COACH_DM_COLORS.gold, key: "kind_workout_share" },
    pr_celebration: { color: COACH_DM_COLORS.gold, key: "kind_pr_celebration" },
    transformation: { color: COACH_DM_COLORS.green, key: "kind_transformation" },
    recovery_milestone: { color: COACH_DM_COLORS.violet, key: "kind_recovery_milestone" },
    challenge_progress: { color: COACH_DM_COLORS.blue, key: "kind_challenge_progress" },
  };
  const { color, key } = map[kind];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{tCommunity(lang, key)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  title: { color: COACH_DM_COLORS.gold, fontSize: 28, fontWeight: "800" },
  iconBtn: { padding: 8 },
  iconText: { fontSize: 22 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  tabActive: { backgroundColor: COACH_DM_COLORS.gold, borderColor: COACH_DM_COLORS.gold },
  tabText: { color: COACH_DM_COLORS.textMuted, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: COACH_DM_COLORS.bg },
  composeBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
    backgroundColor: "#141414",
  },
  composeBtnText: { color: COACH_DM_COLORS.textMuted, fontSize: 14 },
  composeBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  composeInput: {
    color: COACH_DM_COLORS.text,
    minHeight: 80,
    fontSize: 15,
    textAlignVertical: "top",
  },
  composeActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  btnGhost: { paddingVertical: 8, paddingHorizontal: 14 },
  btnGhostText: { color: COACH_DM_COLORS.textMuted, fontWeight: "600" },
  btnPrimary: {
    backgroundColor: COACH_DM_COLORS.gold,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnPrimaryText: { color: COACH_DM_COLORS.bg, fontWeight: "700" },
  empty: { color: COACH_DM_COLORS.textMuted, textAlign: "center" },

  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  cardHead: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: COACH_DM_COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderText: { color: COACH_DM_COLORS.bg, fontWeight: "800" },
  authorName: { color: COACH_DM_COLORS.text, fontWeight: "700", fontSize: 14 },
  timeText: { color: COACH_DM_COLORS.textMuted, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  content: { color: COACH_DM_COLORS.text, fontSize: 15, lineHeight: 22, marginBottom: 10 },
  cardImage: { width: "100%", height: 280, borderRadius: 10, marginBottom: 10 },
  reactionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  reactionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#1f1f1f",
  },
  reactionBtnActive: { backgroundColor: COACH_DM_COLORS.gold },
  reactionEmoji: { fontSize: 18 },
  countText: { color: COACH_DM_COLORS.textMuted, fontSize: 12 },
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COACH_DM_COLORS.border,
    paddingTop: 8,
    gap: 16,
  },
  actionBtn: { paddingVertical: 4 },
  actionText: { color: COACH_DM_COLORS.textMuted, fontSize: 13, fontWeight: "600" },
});

export default CommunityFeedScreen;
