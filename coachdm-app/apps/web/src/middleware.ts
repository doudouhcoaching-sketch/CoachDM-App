// ═══════════════════════════════════════════════════════════════
// COACH DM — Middleware Next.js
// 
// Refresh la session Supabase sur chaque request (essentiel sur RSC).
// Protège les routes /(app) et /(coach).
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@coachdm/shared';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Important : appel pour rafraîchir la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Routes protégées : /app/* et /coach/*
  const isProtected =
    path.startsWith('/app') ||
    path.startsWith('/coach') ||
    path === '/dashboard';

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Si déjà connecté et tente d'aller sur /sign-in → /app
  if ((path === '/sign-in' || path === '/sign-up') && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - api/stripe/webhook (signature vérifiée séparément)
     * - fichiers avec extension
     */
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\..*).*)',
  ],
};
