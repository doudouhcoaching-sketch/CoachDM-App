// ═══════════════════════════════════════════════════════════════
// COACH DM — Supabase client (server, RSC + actions)
// 
// Cookies sont gérés via next/headers, asynchrone en Next 15.
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@coachdm/shared';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components ne peuvent pas écrire de cookies — ignoré
          }
        },
      },
    },
  );
}

/**
 * Client admin avec service_role pour les opérations sensibles
 * (webhook Stripe, migrations, etc.). À UTILISER UNIQUEMENT côté serveur,
 * jamais exposé au client.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
  }
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}
