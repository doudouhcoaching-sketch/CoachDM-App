// ============================================================
// COACH DM — Stripe Webhook Edge Function (Deno)
// Path: supabase/functions/stripe-webhook/index.ts
// 
// Sécurité :
//  - Signature verification stricte (Stripe-Signature header)
//  - Idempotency via table stripe_events (event_id PRIMARY KEY)
//  - Service role key utilisée pour bypass RLS
//  - Réponse 200 systématique si déjà traité (évite retries Stripe)
// 
// Events gérés :
//  - checkout.session.completed       → upsert subscription
//  - customer.subscription.created    → upsert subscription
//  - customer.subscription.updated    → upsert (status, period_end, etc)
//  - customer.subscription.deleted    → downgrade to free
//  - customer.subscription.trial_will_end → notification (3j avant fin)
//  - invoice.paid                     → mark paid
//  - invoice.payment_failed           → retention email + dunning
//  - invoice.payment_action_required  → SCA challenge
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.224.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required env vars');
  throw new Error('Missing env vars');
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

async function alreadyProcessed(eventId: string): Promise<boolean> {
  const { data } = await supabase
    .from('stripe_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();
  return Boolean(data);
}

async function markProcessed(eventId: string, eventType: string, payload: unknown): Promise<void> {
  await supabase.from('stripe_events').insert({
    event_id: eventId,
    event_type: eventType,
    payload,
    processed_at: new Date().toISOString(),
  });
}

async function upsertSubscription(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  status: string,
  priceId: string,
  currentPeriodEnd: number,
  trialEnd: number | null,
  cancelAtPeriodEnd: boolean,
) {
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_price_id: priceId,
      status,
      current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
      trial_end: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
      cancel_at_period_end: cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  );
  if (error) throw error;
}

async function resolveUserIdFromCustomer(stripeCustomerId: string): Promise<string | null> {
  // 1. Tenter via subscriptions existantes
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();
  if (sub?.user_id) return sub.user_id;

  // 2. Tenter via Stripe customer metadata.user_id
  try {
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (!customer.deleted && customer.metadata?.user_id) {
      return customer.metadata.user_id;
    }
  } catch (e) {
    console.error('Customer fetch failed', e);
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// Handlers par type d'event
// ────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.user_id || session.client_reference_id;
  if (!userId) {
    console.warn('checkout.session.completed sans user_id metadata');
    return;
  }
  if (!session.subscription || !session.customer) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  await upsertSubscription(
    userId,
    session.customer as string,
    subscription.id,
    subscription.status,
    subscription.items.data[0].price.id,
    subscription.current_period_end,
    subscription.trial_end,
    subscription.cancel_at_period_end,
  );

  // Mark profile as premium
  await supabase.from('user_profiles')
    .update({ tier: 'premium', tier_updated_at: new Date().toISOString() })
    .eq('id', userId);

  console.log(`✓ Checkout completed for user ${userId}`);
}

async function handleSubscriptionUpsert(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = await resolveUserIdFromCustomer(subscription.customer as string);
  if (!userId) {
    console.warn(`Cannot resolve user_id for customer ${subscription.customer}`);
    return;
  }

  await upsertSubscription(
    userId,
    subscription.customer as string,
    subscription.id,
    subscription.status,
    subscription.items.data[0].price.id,
    subscription.current_period_end,
    subscription.trial_end,
    subscription.cancel_at_period_end,
  );

  // Update tier selon status
  const newTier = ['active', 'trialing'].includes(subscription.status) ? 'premium' : 'free';
  await supabase.from('user_profiles')
    .update({ tier: newTier, tier_updated_at: new Date().toISOString() })
    .eq('id', userId);

  console.log(`✓ Subscription ${event.type} for user ${userId} → ${newTier}`);
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = await resolveUserIdFromCustomer(subscription.customer as string);
  if (!userId) return;

  await supabase.from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  await supabase.from('user_profiles')
    .update({ tier: 'free', tier_updated_at: new Date().toISOString() })
    .eq('id', userId);

  console.log(`✓ Subscription canceled for user ${userId}`);
}

async function handleTrialWillEnd(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = await resolveUserIdFromCustomer(subscription.customer as string);
  if (!userId) return;

  // Créer notification in-app trilingue
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'trial_ending',
    title_fr: 'Ton essai gratuit se termine bientôt',
    title_en: 'Your free trial is ending soon',
    title_nl: 'Je gratis proefperiode loopt binnenkort af',
    body_fr: 'Ton essai Coach DM Premium se termine dans 3 jours. Continue sans interruption.',
    body_en: 'Your Coach DM Premium trial ends in 3 days. Keep going without interruption.',
    body_nl: 'Je Coach DM Premium-proef eindigt over 3 dagen. Ga zonder onderbreking door.',
    action_url: 'coachdm://account/subscription',
  });

  console.log(`✓ Trial ending notification sent to user ${userId}`);
}

async function handleInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  if (!invoice.subscription) return;
  const userId = await resolveUserIdFromCustomer(invoice.customer as string);
  if (!userId) return;

  await supabase.from('invoices').upsert(
    {
      user_id: userId,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: invoice.subscription as string,
      amount_paid_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      paid_at: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : new Date().toISOString(),
    },
    { onConflict: 'stripe_invoice_id' },
  );

  console.log(`✓ Invoice paid for user ${userId} : ${invoice.amount_paid / 100}€`);
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const userId = await resolveUserIdFromCustomer(invoice.customer as string);
  if (!userId) return;

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payment_failed',
    title_fr: 'Échec de paiement',
    title_en: 'Payment failed',
    title_nl: 'Betaling mislukt',
    body_fr: 'Ton dernier paiement Coach DM Premium a échoué. Mets à jour ton moyen de paiement.',
    body_en: 'Your latest Coach DM Premium payment failed. Update your payment method.',
    body_nl: 'Je laatste Coach DM Premium-betaling is mislukt. Werk je betaalmethode bij.',
    action_url: 'coachdm://account/billing',
  });

  console.log(`⚠ Payment failed for user ${userId}`);
}

// ────────────────────────────────────────────────────────────
// Main handler
// ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    return new Response('Missing signature', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error(`❌ Signature verification failed: ${(err as Error).message}`);
    return new Response('Invalid signature', { status: 400 });
  }

  // Idempotency check
  if (await alreadyProcessed(event.id)) {
    console.log(`⏭ Event ${event.id} already processed`);
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event);
        break;
      case 'invoice.payment_failed':
      case 'invoice.payment_action_required':
        await handleInvoicePaymentFailed(event);
        break;
      default:
        console.log(`ℹ Unhandled event type: ${event.type}`);
    }

    await markProcessed(event.id, event.type, event.data.object);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`❌ Handler error for ${event.type}:`, err);
    // Stripe retentera automatiquement (jusqu'à 3 jours)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
