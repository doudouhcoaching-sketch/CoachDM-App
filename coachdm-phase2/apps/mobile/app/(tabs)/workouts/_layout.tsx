// apps/mobile/app/(tabs)/workouts/_layout.tsx
import { Stack } from 'expo-router';

export default function WorkoutsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="program" />
      <Stack.Screen name="session" options={{ presentation: 'card' }} />
    </Stack>
  );
}
