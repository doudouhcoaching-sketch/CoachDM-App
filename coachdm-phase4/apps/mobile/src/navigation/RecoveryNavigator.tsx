// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Mobile · RecoveryNavigator
// ═══════════════════════════════════════════════════════════════════════════
// Stack pour le flux Recovery : Dashboard → Sleep / Hydration / Habits / Streaks
// À monter dans le BottomTabNavigator principal sous l'onglet "Recovery"
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RecoveryDashboardScreen } from '../screens/recovery/RecoveryDashboardScreen';
import { SleepScreen } from '../screens/recovery/SleepScreen';
import { HydrationScreen } from '../screens/recovery/HydrationScreen';
import { HabitsScreen } from '../screens/recovery/HabitsScreen';
import { StreaksScreen } from '../screens/recovery/StreaksScreen';
import { theme } from '../lib/theme';

const Stack = createNativeStackNavigator();

export function RecoveryNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.gold,
        headerTitleStyle: { fontWeight: '900' },
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen
        name="RecoveryDashboard"
        component={RecoveryDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Sleep" component={SleepScreen} options={{ title: 'Sommeil' }} />
      <Stack.Screen name="Hydration" component={HydrationScreen} options={{ title: 'Hydratation' }} />
      <Stack.Screen name="Habits" component={HabitsScreen} options={{ title: 'Habitudes' }} />
      <Stack.Screen name="Streaks" component={StreaksScreen} options={{ title: 'Séries' }} />
    </Stack.Navigator>
  );
}
