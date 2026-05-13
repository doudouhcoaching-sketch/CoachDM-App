// ============================================================
// Coach DM · Phase 6 · CommunityNavigator
// Bottom tabs + stack pour la communauté
// ============================================================

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import { COACH_DM_COLORS, tCommunity, type Lang } from "@coachdm/shared/community";

import CommunityFeedScreen from "../screens/community/CommunityFeedScreen";
import CommunityCommentsScreen from "../screens/community/CommunityCommentsScreen";
import CommunityReportScreen from "../screens/community/CommunityReportScreen";
import CommunityNotificationsScreen from "../screens/community/CommunityNotificationsScreen";
import ChallengesListScreen from "../screens/community/ChallengesListScreen";
import ChallengeDetailScreen from "../screens/community/ChallengeDetailScreen";
import LeaderboardScreen from "../screens/community/LeaderboardScreen";
import StoriesScreen from "../screens/community/StoriesScreen";
import StoryComposeScreen from "../screens/community/StoryComposeScreen";

import { useLang } from "../lib/useLang";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: COACH_DM_COLORS.bg }, headerTintColor: COACH_DM_COLORS.gold, headerShadowVisible: false }}>
      <Stack.Screen
        name="Feed"
        component={CommunityFeedScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CommunityComments"
        component={CommunityCommentsScreen}
        options={{ title: "" }}
      />
      <Stack.Screen
        name="CommunityReport"
        component={CommunityReportScreen}
        options={{ title: "" }}
      />
      <Stack.Screen
        name="CommunityNotifications"
        component={CommunityNotificationsScreen}
        options={{ title: "" }}
      />
    </Stack.Navigator>
  );
}

function ChallengesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: COACH_DM_COLORS.bg }, headerTintColor: COACH_DM_COLORS.gold, headerShadowVisible: false }}>
      <Stack.Screen
        name="ChallengesList"
        component={ChallengesListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChallengeDetail"
        component={ChallengeDetailScreen}
        options={{ title: "" }}
      />
    </Stack.Navigator>
  );
}

function StoriesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: COACH_DM_COLORS.bg }, headerTintColor: COACH_DM_COLORS.gold, headerShadowVisible: false }}>
      <Stack.Screen name="Stories" component={StoriesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StoryCompose" component={StoryComposeScreen} options={{ title: "" }} />
    </Stack.Navigator>
  );
}

export function CommunityNavigator() {
  const lang: Lang = useLang();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0d0d0d",
          borderTopColor: COACH_DM_COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COACH_DM_COLORS.gold,
        tabBarInactiveTintColor: COACH_DM_COLORS.textMuted,
        tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedStack}
        options={{
          tabBarLabel: tCommunity(lang, "tab_feed"),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📰</Text>,
        }}
      />
      <Tab.Screen
        name="ChallengesTab"
        component={ChallengesStack}
        options={{
          tabBarLabel: tCommunity(lang, "tab_challenges"),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏆</Text>,
        }}
      />
      <Tab.Screen
        name="LeaderboardTab"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: tCommunity(lang, "tab_leaderboards"),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="StoriesTab"
        component={StoriesStack}
        options={{
          tabBarLabel: tCommunity(lang, "tab_stories"),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⭐</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default CommunityNavigator;
