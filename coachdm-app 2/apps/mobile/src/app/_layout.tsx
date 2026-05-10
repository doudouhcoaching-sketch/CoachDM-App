// ═══════════════════════════════════════════════════════════════
// COACH DM — Root layout
// 
// Providers globaux : React Query, hydratation auth, redirection
// selon état (logged out → auth, no onboarding → onboarding,
// connecté → tabs).
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';

import { useInitAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/lib/store';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function AuthRouter({ children }: { children: React.ReactNode }) {
  useInitAuth();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    SplashScreen.hideAsync().catch(() => {});

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }

    // Logged in mais pas d'onboarding → onboarding
    if (profile && !profile.onboarding_completed) {
      if (!inOnboardingGroup) router.replace('/(onboarding)/profile');
      return;
    }

    // Tout bon → tabs
    if (profile?.onboarding_completed && (inAuthGroup || inOnboardingGroup)) {
      router.replace('/(tabs)');
    }
  }, [isInitialized, session, profile, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar style="light" />
            <AuthRouter>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="(modals)"
                  options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                  }}
                />
              </Stack>
            </AuthRouter>
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
