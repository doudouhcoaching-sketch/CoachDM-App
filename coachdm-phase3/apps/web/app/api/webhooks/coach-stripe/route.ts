// apps/web/app/api/webhooks/coach-stripe/route.ts
// ============================================================
// Coach DM · Web · Stripe webhook for COACH subscriptions
// ============================================================
// Mounts at /api/webhooks/coach-stripe
// Use a separate Stripe webhook signing secret from the client
// (member 19.99€) subscription webhook.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

const COACH_WEBHOOK_SECRET = process.env.STRIPE_COACH_WEBHOOK_SECRET!;

// Service-role client for unrestricted writes (webhook context)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, COACH_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[coach-stripe] signature verify failed', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const coachUserId = session.metadata?.coach_user_id;
        if (!coachUserId) break;

        await supabaseAdmin.from('coach_subscriptions').upsert(
          {
            coach_user_id: coachUserId,
            status: 'active',
            plan: (session.metadata?.plan as any) ?? 'coach_pro',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          },
          { onConflict: 'coach_user_id' }
        );

        // Promote profile to coach role (only if currently 'client')
        await supabaseAdmin
          .from('profiles')
          .update({ role: 'coach' })
          .eq('id', coachUserId)
          .eq('role', 'client');
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const status = mapStripeStatus(sub.status);
        await supabaseAdmin
          .from('coach_subscriptions')
          .update({
            status,
            current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const { data: row } = await supabaseAdmin
          .from('coach_subscriptions')
          .select('coach_user_id')
          .eq('stripe_subscription_id', sub.id)
          .maybeSingle();

        await supabaseAdmin
          .from('coach_subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', sub.id);

        // Demote role back to client (unless super_admin)
        if (row?.coach_user_id) {
          await supabaseAdmin
            .from('profiles')
            .update({ role: 'client' })
            .eq('id', row.coach_user_id)
            .eq('role', 'coach');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if ((invoice as any).subscription) {
          await supabaseAdmin
            .from('coach_subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', (invoice as any).subscription as string);
        }
        break;
      }

      default:
        // Ignore other event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[coach-stripe] handler error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function mapStripeStatus(s: Stripe.Subscription.Status): string {
  switch (s) {
    case 'trialing':
      return 'trial';
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'active';
  }
}

// Stripe webhooks need raw body — disable Next.js body parsing.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
