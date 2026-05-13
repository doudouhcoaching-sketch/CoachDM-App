// =====================================================================
// COACH DM · APP · PHASE 7 — IA COACH ASSISTANT
// apps/mobile/src/navigation/AICoachNavigator.tsx
// 4 tabs Phase 7 : Chat, Suggestions, Recovery, Plateaus.
// =====================================================================

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { AIChat } from '../screens/ai/AIChat';
import { AIConversationList } from '../screens/ai/AIConversationList';
import { AISessionSuggestion } from '../screens/ai/AISessionSuggestion';
import { AIRecoveryToday } from '../screens/ai/AIRecoveryToday';
import { AIPlateauList } from '../screens/ai/AIPlateauList';
import { AIAdjustmentList } from '../screens/ai/AIAdjustmentList';
import { AIAdjustmentDetail } from '../screens/ai/AIAdjustmentDetail';
import { t } from '@coachdm/shared/ai';
import { useUserLang } from '../hooks/useUserLang';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PALETTE = {
  bg: '#0A0A0A',
  bgCard: '#161616',
  gold: '#D4AF37',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#262626',
};

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTS}>
      <Stack.Screen name="AIConversationList" component={AIConversationList} options={{ title: 'Coach IA' }} />
      <Stack.Screen name="AIChat" component={AIChat} options={{ title: 'Coach IA' }} />
    </Stack.Navigator>
  );
}

function AdjustStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTS}>
      <Stack.Screen name="AIAdjustmentList"   component={AIAdjustmentList}   options={{ title: 'Ajustements' }} />
      <Stack.Screen name="AIAdjustmentDetail" component={AIAdjustmentDetail} options={{ title: 'Détail' }} />
    </Stack.Navigator>
  );
}

const SCREEN_OPTS = {
  headerStyle: { backgroundColor: PALETTE.bg },
  headerTintColor: PALETTE.gold,
  headerTitleStyle: { fontWeight: '700' as const },
  contentStyle: { backgroundColor: PALETTE.bg },
};

export function AICoachNavigator() {
  const lang = useUserLang();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: PALETTE.bg, borderTopColor: PALETTE.border },
        tabBarActiveTintColor: PALETTE.gold,
        tabBarInactiveTintColor: PALETTE.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Chat: 'chatbubble-ellipses',
            Session: 'fitness',
            Recovery: 'leaf',
            Plateau: 'analytics',
            Adjust: 'options',
          };
          return <Ionicons name={map[route.name] ?? 'cube'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Chat"     component={ChatStack}          options={{ title: t('ai.tab.chat', lang) }} />
      <Tab.Screen name="Session"  component={AISessionSuggestion} options={{ title: t('ai.tab.suggestions', lang) }} />
      <Tab.Screen name="Recovery" component={AIRecoveryToday}     options={{ title: t('ai.tab.recovery', lang) }} />
      <Tab.Screen name="Plateau"  component={AIPlateauList}       options={{ title: t('ai.tab.plateau', lang) }} />
      <Tab.Screen name="Adjust"   component={AdjustStack}         options={{ title: t('ai.tab.adjustments', lang) }} />
    </Tab.Navigator>
  );
}
