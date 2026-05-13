// ============================================================
// Coach DM · Phase 6 · StoriesScreen
// Carrousel horizontal + viewer plein écran
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  COACH_DM_COLORS,
  computeStoryTimeLeft,
  REACTION_EMOJIS,
  REACTION_ORDER,
  tCommunity,
  type CommunityStory,
  type Lang,
  type ReactionKind,
} from "@coachdm/shared/community";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLang } from "../../lib/useLang";

const { width, height } = Dimensions.get("window");

interface StoryWithAuthor extends CommunityStory {
  author: { id: string; full_name: string | null; avatar_url: string | null };
}

export function StoriesScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const lang: Lang = useLang();
  const [stories, setStories] = useState<StoryWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const t = useCallback((k: any) => tCommunity(lang, k), [lang]);

  const fetch = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("community_stories")
      .select(
        `*, author:profiles!community_stories_author_id_fkey ( id, full_name, avatar_url )`,
      )
      .eq("status", "visible")
      .or(`featured.eq.true,expires_at.gt.${nowIso}`)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setStories((data ?? []) as StoryWithAuthor[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const markViewed = useCallback(
    async (storyId: string) => {
      if (!user) return;
      await supabase
        .from("community_story_views")
        .upsert({ story_id: storyId, viewer_id: user.id }, { onConflict: "story_id,viewer_id", ignoreDuplicates: true });
    },
    [user],
  );

  const react = async (storyId: string, kind: ReactionKind) => {
    if (!user) return;
    await supabase.from("community_story_reactions").upsert(
      { story_id: storyId, user_id: user.id, kind },
      { onConflict: "story_id,user_id,kind", ignoreDuplicates: true },
    );
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
      <View style={styles.header}>
        <Text style={styles.title}>{t("stories_title")}</Text>
        <Pressable
          onPress={() => navigation.navigate("StoryCompose")}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      {stories.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.empty}>{t("stories_empty")}</Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(s) => s.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.tile}
              onPress={() => {
                setViewerIndex(index);
                markViewed(item.id);
              }}
            >
              <Image source={{ uri: item.image_url }} style={styles.tileImg} />
              <View style={styles.tileOverlay}>
                {item.featured ? (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredText}>★ {t("stories_featured")}</Text>
                  </View>
                ) : null}
                <View style={styles.tileFooter}>
                  <Text style={styles.tileAuthor} numberOfLines={1}>
                    {item.author.full_name ?? "—"}
                  </Text>
                  {item.stat_value ? (
                    <Text style={styles.tileStat}>{item.stat_value}</Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      {viewerIndex !== null ? (
        <StoryViewer
          stories={stories}
          startIndex={viewerIndex}
          lang={lang}
          onClose={() => setViewerIndex(null)}
          onView={markViewed}
          onReact={react}
        />
      ) : null}
    </View>
  );
}

function StoryViewer({
  stories,
  startIndex,
  lang,
  onClose,
  onView,
  onReact,
}: {
  stories: StoryWithAuthor[];
  startIndex: number;
  lang: Lang;
  onClose: () => void;
  onView: (id: string) => void;
  onReact: (id: string, kind: ReactionKind) => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const story = stories[idx];

  useEffect(() => {
    if (story) onView(story.id);
  }, [story, onView]);

  if (!story) return null;

  const caption = lang === "en" ? story.caption_en : lang === "nl" ? story.caption_nl : story.caption_fr;
  const left = computeStoryTimeLeft(story.expires_at);

  return (
    <Modal visible animationType="fade" transparent={false}>
      <View style={styles.viewer}>
        <Pressable style={styles.viewerTopTouch} onPress={onClose} />
        <View style={styles.viewerHeader}>
          <Text style={styles.viewerAuthor}>{story.author.full_name ?? "—"}</Text>
          {!story.featured ? (
            <Text style={styles.viewerTime}>
              {tCommunity(lang, "stories_expires_in")} {left.hours}h{String(left.minutes).padStart(2, "0")}
            </Text>
          ) : (
            <Text style={[styles.viewerTime, { color: COACH_DM_COLORS.gold }]}>★ Featured</Text>
          )}
          <Pressable onPress={onClose} style={styles.viewerClose}>
            <Text style={{ color: COACH_DM_COLORS.text, fontSize: 28 }}>×</Text>
          </Pressable>
        </View>

        {story.kind === "before_after" && story.image_before_url ? (
          <View style={styles.beforeAfterRow}>
            <View style={{ flex: 1 }}>
              <Image source={{ uri: story.image_before_url }} style={styles.beforeAfterImg} />
              <Text style={styles.baLabel}>{tCommunity(lang, "stories_before")}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Image source={{ uri: story.image_url }} style={styles.beforeAfterImg} />
              <Text style={styles.baLabel}>{tCommunity(lang, "stories_after")}</Text>
            </View>
          </View>
        ) : (
          <Image source={{ uri: story.image_url }} style={styles.viewerImage} resizeMode="contain" />
        )}

        {story.stat_label || story.stat_value ? (
          <View style={styles.statBadge}>
            {story.stat_label ? <Text style={styles.statLabel}>{story.stat_label}</Text> : null}
            {story.stat_value ? <Text style={styles.statValue}>{story.stat_value}</Text> : null}
          </View>
        ) : null}

        {caption ? <Text style={styles.viewerCaption}>{caption}</Text> : null}

        <View style={styles.viewerReactions}>
          {REACTION_ORDER.map((k) => (
            <Pressable key={k} onPress={() => onReact(story.id, k)} style={styles.reactBtn}>
              <Text style={styles.reactEmoji}>{REACTION_EMOJIS[k]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.viewerNav}>
          <Pressable
            disabled={idx === 0}
            onPress={() => setIdx((i) => Math.max(0, i - 1))}
            style={[styles.navBtn, idx === 0 && { opacity: 0.3 }]}
          >
            <Text style={styles.navText}>‹</Text>
          </Pressable>
          <Text style={styles.navCount}>
            {idx + 1} / {stories.length}
          </Text>
          <Pressable
            disabled={idx === stories.length - 1}
            onPress={() => setIdx((i) => Math.min(stories.length - 1, i + 1))}
            style={[styles.navBtn, idx === stories.length - 1 && { opacity: 0.3 }]}
          >
            <Text style={styles.navText}>›</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 56,
  },
  title: { color: COACH_DM_COLORS.gold, fontSize: 28, fontWeight: "800" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COACH_DM_COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: COACH_DM_COLORS.bg, fontSize: 24, fontWeight: "800" },
  empty: { color: COACH_DM_COLORS.textMuted },

  tile: {
    flex: 1,
    aspectRatio: 0.6,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: "#141414",
  },
  tileImg: { width: "100%", height: "100%" },
  tileOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", padding: 8 },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: COACH_DM_COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredText: { color: COACH_DM_COLORS.bg, fontWeight: "800", fontSize: 10 },
  tileFooter: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 6,
    borderRadius: 6,
  },
  tileAuthor: { color: COACH_DM_COLORS.text, fontWeight: "700", fontSize: 13 },
  tileStat: { color: COACH_DM_COLORS.gold, fontWeight: "800", fontSize: 14 },

  viewer: { flex: 1, backgroundColor: "#000", padding: 16, paddingTop: 56 },
  viewerTopTouch: { position: "absolute", top: 0, left: 0, right: 0, height: 56 },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  viewerAuthor: { color: COACH_DM_COLORS.text, fontWeight: "800", fontSize: 16, flex: 1 },
  viewerTime: { color: COACH_DM_COLORS.textMuted, fontSize: 12 },
  viewerClose: { padding: 8, marginLeft: 8 },
  viewerImage: { flex: 1, width: width - 32, alignSelf: "center" },
  beforeAfterRow: { flexDirection: "row", flex: 1, gap: 4 },
  beforeAfterImg: { width: "100%", flex: 1, borderRadius: 8 },
  baLabel: {
    color: COACH_DM_COLORS.gold,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
  statBadge: {
    alignSelf: "center",
    backgroundColor: COACH_DM_COLORS.gold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statLabel: { color: COACH_DM_COLORS.bg, fontWeight: "700", fontSize: 14 },
  statValue: { color: COACH_DM_COLORS.bg, fontWeight: "800", fontSize: 18 },
  viewerCaption: {
    color: COACH_DM_COLORS.text,
    textAlign: "center",
    fontSize: 14,
    marginVertical: 8,
  },
  viewerReactions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 8,
  },
  reactBtn: { backgroundColor: "#1a1a1a", padding: 10, borderRadius: 999 },
  reactEmoji: { fontSize: 22 },
  viewerNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  navBtn: { padding: 12 },
  navText: { color: COACH_DM_COLORS.gold, fontSize: 36, fontWeight: "800" },
  navCount: { color: COACH_DM_COLORS.textMuted },
});

export default StoriesScreen;
