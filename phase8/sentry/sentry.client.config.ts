// ============================================================
// COACH DM — Sentry Client (Next.js 15 App Router)
// Path: apps/web/sentry.client.config.ts
// ============================================================
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay (sample 10% normal, 100% errors)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,        // Mask PII by default
      maskAllInputs: true,      // Mask all form inputs (emails, passwords, payment)
      blockAllMedia: false,
      networkDetailAllowUrls: [
        /^https:\/\/[^/]+\.supabase\.co/,
        /^https:\/\/api\.stripe\.com/,
      ],
    }),
    Sentry.browserTracingIntegration(),
  ],

  // PII scrubbing
  sendDefaultPii: false,

  beforeSend(event, hint) {
    // Strip auth tokens from URLs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/access_token=[^&]+/g, 'access_token=REDACTED');
    }
    // Strip email + password from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) => {
        if (b.data && typeof b.data === 'object') {
          const data = { ...b.data } as Record<string, unknown>;
          for (const k of ['email', 'password', 'token', 'api_key']) {
            if (k in data) data[k] = '[REDACTED]';
          }
          b.data = data;
        }
        return b;
      });
    }
    return event;
  },

  ignoreErrors: [
    // Network noise (utilisateur offline, etc.)
    'NetworkError',
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // Browser extensions
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Stripe (errors gérées par le UI)
    'IntegrationError',
  ],
});
