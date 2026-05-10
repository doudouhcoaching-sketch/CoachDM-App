// ═══════════════════════════════════════════════════════════════
// COACH DM — POST /api/stripe/checkout
// 
// Crée une session Stripe Checkout pour 19,99€/mois + 7j trial.
// Retourne l'URL où rediriger le user.
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

  try {
    const admin = createAdminClient();

    // Récupère ou crée le customer Stripe
    const { data: existing } = await admin
      .from('subscriptions')
      .select('stripe_customer_id, status, stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Si un abonnement actif existe déjà → renvoie au portal
    if (
      existing?.stripe_subscription_id &&
      ['active', 'trialing'].includes(existing.status)
    ) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: existing.stripe_customer_id!,
        return_url: STRIPE_CONFIG.customerPortalReturnUrl,
      });
      return NextResponse.json({ url: portal.url });
    }

    let customerId = existing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await admin.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: 'incomplete',
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: STRIPE_CONFIG.priceIdMonthly, quantity: 1 }],
      subscription_data: {
        trial_period_days: STRIPE_CONFIG.trialDays,
        metadata: { supabase_user_id: user.id },
      },
      allow_promotion_codes: true,
      success_url: STRIPE_CONFIG.successUrl,
      cancel_url: STRIPE_CONFIG.cancelUrl,
      // Conformité TVA Europe (OSS)
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      billing_address_collection: 'required',
      locale: 'fr',
      metadata: { supabase_user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
