// ═══════════════════════════════════════════════════════════════
// COACH DM — POST /api/stripe/portal
// 
// Ouvre le Customer Portal Stripe (gérer carte, factures, annuler).
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No subscription found' },
      { status: 404 },
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: STRIPE_CONFIG.customerPortalReturnUrl,
  });

  return NextResponse.json({ url: session.url });
}
