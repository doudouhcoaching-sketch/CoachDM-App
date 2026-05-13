// ============================================================
// Coach DM · Phase 6 · CommunityCommentsScreen
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { COACH_DM_COLORS, tCommunity, type Lang } from "@coachdm/shared/community";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLang } from "../../lib/useLang";

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  status: string;
  created_at: string;
  author: { id: string; full_name: string | null; avatar_url: string | null };
};

export function CommunityCommentsScreen() {
  const route = useRoute<any>();
  const postId: string = route.params?.postId;
  const { user } = useAuth();
  const lang: Lang = useLang();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);

  const t = useCallback((k: any) => tCommunity(lang, k), [lang]);

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from("community_comments")
      .select(
        `*, author:profiles!community_comments_author_id_fkey ( id, full_name, avatar_url )`,
      )
      .eq("post_id", postId)
      .eq("status", "visible")
      .order("created_at", { ascending: true });
    if (!error) setComments((data ?? []) as CommentRow[]);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    const channel = supabase
      .channel(`comments_${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => fetchComments(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, fetchComments]);

  const send = async () => {
    if (!user || input.trim().length === 0) return;
    setPosting(true);
    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      author_id: user.id,
      content: input.trim(),
    });
    if (!error) setInput("");
    setPosting(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COACH_DM_COLORS.gold} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t("feed_comments_title")}</Text>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {lang === "fr"
              ? "Aucun commentaire."
              : lang === "nl"
                ? "Geen reacties."
                : "No comments."}
          </Text>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.author.avatar_url ? (
              <Image source={{ uri: item.author.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPh}>
                <Text style={styles.avatarPhText}>
                  {(item.author.full_name ?? "?").slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.bubble}>
              <Text style={styles.authorName}>{item.author.full_name ?? "—"}</Text>
              <Text style={styles.commentText}>{item.content}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={t("feed_comment_placeholder")}
          placeholderTextColor={COACH_DM_COLORS.textMuted}
          value={input}
          onChangeText={setInput}
          maxLength={1000}
          multiline
        />
        <Pressable
          onPress={send}
          disabled={posting || input.trim().length === 0}
          style={[
            styles.sendBtn,
            (posting || input.trim().length === 0) && { opacity: 0.4 },
          ]}
        >
          <Text style={styles.sendText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COACH_DM_COLORS.bg,
  },
  header: { padding: 16, paddingTop: 56 },
  title: { color: COACH_DM_COLORS.gold, fontSize: 22, fontWeight: "800" },
  empty: { color: COACH_DM_COLORS.textMuted, textAlign: "center", marginTop: 40 },
  row: { flexDirection: "row", marginBottom: 12, alignItems: "flex-start" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  avatarPh: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: COACH_DM_COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPhText: { color: COACH_DM_COLORS.bg, fontWeight: "700" },
  bubble: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  authorName: { color: COACH_DM_COLORS.gold, fontSize: 12, fontWeight: "700" },
  commentText: { color: COACH_DM_COLORS.text, fontSize: 14, marginTop: 2 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COACH_DM_COLORS.border,
    backgroundColor: "#0d0d0d",
  },
  input: {
    flex: 1,
    color: COACH_DM_COLORS.text,
    backgroundColor: "#1a1a1a",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COACH_DM_COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: COACH_DM_COLORS.bg, fontSize: 22, fontWeight: "800" },
});

export default CommunityCommentsScreen;
