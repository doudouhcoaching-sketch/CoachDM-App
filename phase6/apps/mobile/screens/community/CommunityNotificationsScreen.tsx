// ============================================================
// Coach DM · Phase 6 · CommunityNotificationsScreen
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  COACH_DM_COLORS,
  tCommunity,
  type CommunityNotification,
  type CommunityNotifKind,
  type Lang,
} from "@coachdm/shared/community";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLang } from "../../lib/useLang";

const KIND_ICON: Record<CommunityNotifKind, string> = {
  new_comment: "💬",
  new_reaction: "🔥",
  story_featured: "⭐",
  new_challenge: "🏆",
  challenge_completed: "✅",
  challenge_invited: "✉️",
  leaderboard_top3: "🥇",
  post_flagged: "⚠️",
};

export function CommunityNotificationsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const lang: Lang = useLang();
  const [notifs, setNotifs] = useState<CommunityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const t = useCallback((k: any) => tCommunity(lang, k), [lang]);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("community_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setNotifs((data ?? []) as CommunityNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetch]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("community_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    fetch();
  };

  const openNotif = async (n: CommunityNotification) => {
    if (!n.read_at) {
      await supabase
        .from("community_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", n.id);
    }
    if (n.ref_table === "community_posts" && n.ref_id) {
      navigation.navigate("CommunityComments", { postId: n.ref_id });
    } else if (n.ref_table === "community_challenges" && n.ref_id) {
      navigation.navigate("ChallengeDetail", { challengeId: n.ref_id });
    } else if (n.ref_table === "community_stories") {
      navigation.navigate("Stories");
    }
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
        <Text style={styles.title}>{t("notif_title")}</Text>
        <Pressable onPress={markAllRead}>
          <Text style={styles.markRead}>{t("notif_mark_all_read")}</Text>
        </Pressable>
      </View>

      <FlatList
        data={notifs}
        keyExtractor={(n) => n.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetch();
              setRefreshing(false);
            }}
            tintColor={COACH_DM_COLORS.gold}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>{t("notif_empty")}</Text>}
        renderItem={({ item }) => {
          const title =
            lang === "en" ? item.title_en : lang === "nl" ? item.title_nl : item.title_fr;
          const body =
            lang === "en"
              ? item.body_en
              : lang === "nl"
                ? item.body_nl
                : item.body_fr;
          const unread = !item.read_at;
          return (
            <Pressable
              style={[styles.row, unread && styles.rowUnread]}
              onPress={() => openNotif(item)}
            >
              <Text style={styles.icon}>{KIND_ICON[item.kind]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, unread && { color: COACH_DM_COLORS.gold }]}>
                  {title}
                </Text>
                {body ? <Text style={styles.rowBody}>{body}</Text> : null}
                <Text style={styles.rowTime}>
                  {new Date(item.created_at).toLocaleString(lang)}
                </Text>
              </View>
              {unread ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        }}
      />
    </View>
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
  title: { color: COACH_DM_COLORS.gold, fontSize: 24, fontWeight: "800" },
  markRead: { color: COACH_DM_COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  empty: { color: COACH_DM_COLORS.textMuted, textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    backgroundColor: "#141414",
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
    alignItems: "center",
  },
  rowUnread: { borderColor: COACH_DM_COLORS.gold },
  icon: { fontSize: 24, marginRight: 12 },
  rowTitle: { color: COACH_DM_COLORS.text, fontWeight: "700", fontSize: 14 },
  rowBody: { color: COACH_DM_COLORS.textMuted, fontSize: 13, marginTop: 2 },
  rowTime: { color: COACH_DM_COLORS.textMuted, fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COACH_DM_COLORS.gold, marginLeft: 8 },
});

export default CommunityNotificationsScreen;
