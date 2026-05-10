// ═══════════════════════════════════════════════════════════════
// COACH DM — POST /api/stripe/webhook
// 
// Reçoit les events Stripe (signature vérifiée) et synchronise
// la table `subscriptions` en conséquence.
// 
// IMPORTANT : Cette route DOIT être exclue du middleware (déjà fait
// dans middleware.ts via le matcher).
// ═══════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';

// Stripe nécessite le raw body pour vérifier la signature
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err);
    return NextResponse.json(
      { error: 'Signature verification failed' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          (session.metadata?.supabase_user_id as string | undefined) ??
          (session.subscription
            ? await getUserIdFromSubscription(session.subscription as string)
            : null);

        if (!userId || !session.subscription || !session.customer) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        await syncSubscription(userId, subscription, admin);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId =
          (subscription.metadata?.supabase_user_id as string | undefined) ??
          (await getUserIdFromCustomer(subscription.customer as string));

        if (!userId) break;
        await syncSubscription(userId, subscription, admin);
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string,
        );
        const userId =
          (subscription.metadata?.supabase_user_id as string | undefined) ??
          (await getUserIdFromCustomer(subscription.customer as string));
        if (userId) await syncSubscription(userId, subscription, admin);
        break;
      }

      default:
        // Event ignoré
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    // 200 pour éviter retry agressif si erreur côté nous
    return NextResponse.json({ received: true, error: String(err) });
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function getUserIdFromSubscription(
  subscriptionId: string,
): Promise<string | null> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  return (sub.metadata?.supabase_user_id as string | undefined) ?? null;
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function syncSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  admin: ReturnType<typeof createAdminClient>,
) {
  const priceId = subscription.items.data[0]?.price.id;
  const amount = subscription.items.data[0]?.price.unit_amount ?? null;

  await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status: subscription.status,
      current_period_start: new Date(
        subscription.current_period_start * 1000,
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      amount_cents: amount,
      currency: subscription.items.data[0]?.price.currency ?? 'eur',
    },
    { onConflict: 'user_id' },
  );
}
