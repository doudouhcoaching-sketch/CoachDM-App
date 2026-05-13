// ============================================================
// COACH DM — Sentry Edge Runtime (Next.js middleware)
// Path: apps/web/sentry.edge.config.ts
// ============================================================
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
