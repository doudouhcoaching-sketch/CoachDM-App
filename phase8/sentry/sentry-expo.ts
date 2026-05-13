// ============================================================
// COACH DM — Sentry Mobile (Expo SDK 52)
// Path: apps/mobile/lib/sentry.ts
// Import dans App.tsx avant tout le reste.
// ============================================================
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.warn('⚠ EXPO_PUBLIC_SENTRY_DSN absent — Sentry désactivé');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_ENV || 'production',
    release: `coachdm-mobile@${Constants.expoConfig?.version || '1.0.0'}`,
    dist: String(Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1'),

    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,

    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,

    attachScreenshot: false,    // Pas de screenshot auto (PII risk)
    attachViewHierarchy: false,
    sendDefaultPii: false,

    integrations: [
      Sentry.reactNativeTracingIntegration({
        // Trace API calls Supabase + Anthropic
        traceXHR: true,
        traceFetch: true,
        tracingOrigins: [
          /supabase\.co/,
          /coachdm\.be/,
        ],
      }),
    ],

    beforeSend(event) {
      // Strip auth tokens des URLs
      if (event.request?.url) {
        event.request.url = event.request.url.replace(
          /access_token=[^&]+/g,
          'access_token=REDACTED'
        );
      }
      return event;
    },

    ignoreErrors: [
      'Network request failed',
      'Network Error',
      'Aborted',
      'Login cancelled by user',
      // Expo dev tools noise
      '__EXPO_ROUTER',
    ],
  });
}

export { Sentry };
