// ═══════════════════════════════════════════════════════════════
// COACH DM — Stripe client (server-side)
// ═══════════════════════════════════════════════════════════════

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY missing');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
  appInfo: {
    name: 'Coach DM',
    version: '1.0.0',
    url: 'https://coachdm.be',
  },
});

export const STRIPE_CONFIG = {
  priceIdMonthly: process.env.STRIPE_PRICE_ID_MONTHLY!,
  trialDays: Number(process.env.STRIPE_TRIAL_DAYS ?? '7'),
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app?checkout=success`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe?checkout=cancel`,
  customerPortalReturnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app/account`,
};
