// ============================================================
// COACH DM — Sentry Server (Next.js 15 App Router)
// Path: apps/web/sentry.server.config.ts
// ============================================================
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 0.1,

  sendDefaultPii: false,

  beforeSend(event) {
    // Strip Authorization header
    if (event.request?.headers) {
      const headers = event.request.headers as Record<string, string>;
      if (headers.authorization) headers.authorization = '[REDACTED]';
      if (headers.cookie) headers.cookie = '[REDACTED]';
    }
    return event;
  },

  ignoreErrors: [
    'AbortError',           // Request abort par l'utilisateur
    'TimeoutError',
  ],
});
