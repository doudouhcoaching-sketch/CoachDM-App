'use server';

// ═══════════════════════════════════════════════════════════════
// COACH DM — Server Actions
// ═══════════════════════════════════════════════════════════════

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/sign-in');
}

export async function startCheckoutAction() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/checkout`,
    { method: 'POST', cache: 'no-store' },
  );
  const data = await res.json();
  if (data.url) redirect(data.url);
  return { error: data.error ?? 'Erreur Stripe' };
}

export async function openPortalAction() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/portal`,
    { method: 'POST', cache: 'no-store' },
  );
  const data = await res.json();
  if (data.url) redirect(data.url);
  return { error: data.error ?? 'Erreur portal' };
}

export async function refreshDataAction() {
  revalidatePath('/app');
}
