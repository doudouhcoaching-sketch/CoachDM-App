// =====================================================================
// Coach DM · Phase 5 · ProgressionNavigator
// =====================================================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COACH_DM_COLORS, t, type Locale } from '@coachdm/shared/progression';
import { ProgressionDashboardScreen } from '../screens/progression/ProgressionDashboardScreen';
import { WeightChartScreen } from '../screens/progression/WeightChartScreen';
import { MeasurementsChartScreen } from '../screens/progression/MeasurementsChartScreen';
import { PerformanceChartScreen } from '../screens/progression/PerformanceChartScreen';
import { ActivityCalendarScreen } from '../screens/progression/ActivityCalendarScreen';
import { PRsListScreen } from '../screens/progression/PRsListScreen';
import { PhotoComparisonScreen } from '../screens/progression/PhotoComparisonScreen';
import { MonthlyReportScreen } from '../screens/progression/MonthlyReportScreen';

export type ProgressionStackParams = {
  ProgressionDashboard: undefined;
  WeightChart: undefined;
  MeasurementsChart: undefined;
  PerformanceChart: undefined;
  ActivityCalendar: undefined;
  PRsList: undefined;
  PhotoComparison: undefined;
  MonthlyReport: undefined;
};

const Stack = createNativeStackNavigator<ProgressionStackParams>();

export function ProgressionNavigator({ locale = 'fr' as Locale }: { locale?: Locale }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COACH_DM_COLORS.bg },
        headerTintColor: COACH_DM_COLORS.gold,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: COACH_DM_COLORS.bg },
      }}
    >
      <Stack.Screen
        name="ProgressionDashboard"
        options={{ title: t('progression', locale) }}
      >
        {(props) => <ProgressionDashboardScreen {...props} locale={locale} />}
      </Stack.Screen>
      <Stack.Screen name="WeightChart" options={{ title: t('weight', locale) }}>
        {() => <WeightChartScreen locale={locale} />}
      </Stack.Screen>
      <Stack.Screen
        name="MeasurementsChart"
        options={{ title: t('measurements', locale) }}
      >
        {() => <MeasurementsChartScreen locale={locale} />}
      </Stack.Screen>
      <Stack.Screen
        name="PerformanceChart"
        options={{ title: t('pr_strength', locale) }}
      >
        {() => <PerformanceChartScreen locale={locale} />}
      </Stack.Screen>
      <Stack.Screen
        name="ActivityCalendar"
        options={{ title: t('activity_calendar', locale) }}
      >
        {() => <ActivityCalendarScreen locale={locale} />}
      </Stack.Screen>
      <Stack.Screen name="PRsList" options={{ title: t('personal_records', locale) }}>
        {() => <PRsListScreen locale={locale} />}
      </Stack.Screen>
      <Stack.Screen
        name="PhotoComparison"
        options={{ title: t('progress_photos', locale) }}
      >
        {() => <PhotoComparisonScreen locale={locale} />}
      </Stack.Screen>
      <Stack.Screen name="MonthlyReport" options={{ title: t('monthly_report', locale) }}>
        {() => <MonthlyReportScreen locale={locale} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
