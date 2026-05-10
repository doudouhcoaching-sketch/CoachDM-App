// ═══════════════════════════════════════════════════════════════
// COACH DM — Supabase client (browser, CSR)
// ═══════════════════════════════════════════════════════════════

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@coachdm/shared';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
