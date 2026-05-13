#!/usr/bin/env bash
# ============================================================
# COACH DM — PHASE 8 · 03 STRIPE LIVE SETUP
# Crée produit Premium + prix + webhook vers Edge Function
# Usage: bash 03-stripe-setup.sh
# Prérequis: stripe CLI, $STRIPE_SECRET_KEY_LIVE, 02-migrations-run.sh OK
# ============================================================
set -euo pipefail

GOLD="\033[0;33m"
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m"

if [ -z "${STRIPE_SECRET_KEY_LIVE:-}" ]; then
  echo -e "${RED}✗ STRIPE_SECRET_KEY_LIVE non défini.${NC}"
  echo "  Récupère ta clé live sur dashboard.stripe.com/apikeys"
  exit 1
fi

if [ ! -f ".supabase-prod-ref" ]; then
  echo -e "${RED}✗ .supabase-prod-ref absent. Lance 01-supabase-provision.sh.${NC}"
  exit 1
fi

PROJECT_REF=$(cat .supabase-prod-ref)
WEBHOOK_URL="https://${PROJECT_REF}.supabase.co/functions/v1/stripe-webhook"

echo -e "${GOLD}▶ Stripe live setup${NC}"

# 1. Vérifier qu'on est bien en mode live
ACCOUNT=$(stripe accounts retrieve --api-key "$STRIPE_SECRET_KEY_LIVE" 2>/dev/null | jq -r '.id')
if [[ "$STRIPE_SECRET_KEY_LIVE" != sk_live_* ]]; then
  echo -e "${RED}✗ Clé fournie n'est pas une clé live (sk_live_*).${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Mode live confirmé : $ACCOUNT${NC}"

# 2. Créer le produit Coach DM Premium
echo -e "${GOLD}  → Création produit Coach DM Premium${NC}"
PRODUCT_ID=$(stripe products create \
  --api-key "$STRIPE_SECRET_KEY_LIVE" \
  --name "Coach DM Premium" \
  --description "Accès complet à l'app Coach DM : nutrition, workouts, mobilité, communauté, IA coach. FR/EN/NL." \
  --metadata[brand]="Coach DM" \
  --metadata[locale]="fr,en,nl" \
  --metadata[bce]="BE0840.260.421" \
  --tax-code "txcd_10103001" \
  2>&1 | jq -r '.id' || echo "")

if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
  # Peut-être déjà existant — chercher
  PRODUCT_ID=$(stripe products list --api-key "$STRIPE_SECRET_KEY_LIVE" --limit 100 \
    | jq -r '.data[] | select(.name=="Coach DM Premium") | .id' | head -n1)
fi

if [ -z "$PRODUCT_ID" ]; then
  echo -e "${RED}  ✗ Impossible de créer/trouver le produit${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Produit : $PRODUCT_ID${NC}"

# 3. Créer le prix 19.99 EUR/mois avec trial 7 jours
echo -e "${GOLD}  → Création prix 19.99€/mois (trial 7j)${NC}"
PRICE_ID=$(stripe prices create \
  --api-key "$STRIPE_SECRET_KEY_LIVE" \
  --product "$PRODUCT_ID" \
  --unit-amount 1999 \
  --currency eur \
  --recurring[interval]=month \
  --recurring[trial_period_days]=7 \
  --nickname "Premium Monthly EUR" \
  --metadata[tier]="premium" \
  --metadata[trial_days]="7" \
  | jq -r '.id')
echo -e "${GREEN}  ✓ Prix : $PRICE_ID${NC}"

# 4. Webhook vers Edge Function
echo -e "${GOLD}  → Création webhook → $WEBHOOK_URL${NC}"
WEBHOOK_PAYLOAD=$(stripe webhook_endpoints create \
  --api-key "$STRIPE_SECRET_KEY_LIVE" \
  --url "$WEBHOOK_URL" \
  --enabled-events checkout.session.completed \
  --enabled-events customer.subscription.created \
  --enabled-events customer.subscription.updated \
  --enabled-events customer.subscription.deleted \
  --enabled-events customer.subscription.trial_will_end \
  --enabled-events invoice.paid \
  --enabled-events invoice.payment_failed \
  --enabled-events invoice.payment_action_required \
  --description "Coach DM Edge Function — production")

WEBHOOK_ID=$(echo "$WEBHOOK_PAYLOAD" | jq -r '.id')
WEBHOOK_SECRET=$(echo "$WEBHOOK_PAYLOAD" | jq -r '.secret')

echo -e "${GREEN}  ✓ Webhook : $WEBHOOK_ID${NC}"

# 5. Sauvegarder les IDs
cat <<EOF > .stripe-prod-config
# === GENERATED $(date -u +%Y-%m-%dT%H:%M:%SZ) ===
STRIPE_PRODUCT_ID=$PRODUCT_ID
STRIPE_PRICE_ID=$PRICE_ID
STRIPE_WEBHOOK_ID=$WEBHOOK_ID
STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET
STRIPE_WEBHOOK_URL=$WEBHOOK_URL
EOF
chmod 600 .stripe-prod-config

# 6. Pousser le webhook secret dans Supabase
echo -e "${GOLD}  → Push STRIPE_WEBHOOK_SECRET vers Supabase secrets${NC}"
supabase secrets set "STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET" --project-ref "$PROJECT_REF"
supabase secrets set "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY_LIVE" --project-ref "$PROJECT_REF"
echo -e "${GREEN}  ✓ Secrets pushed${NC}"

# 7. Customer Portal
echo -e "${GOLD}  → Activation Customer Portal${NC}"
stripe billing_portal configurations create \
  --api-key "$STRIPE_SECRET_KEY_LIVE" \
  --business-profile[headline]="Coach DM — Gère ton abonnement" \
  --business-profile[privacy-policy-url]="https://coachdm.be/privacy.html" \
  --business-profile[terms-of-service-url]="https://coachdm.be/cgv.html" \
  --features[customer-update][enabled]=true \
  --features[customer-update][allowed-updates][]=email \
  --features[customer-update][allowed-updates][]=name \
  --features[customer-update][allowed-updates][]=address \
  --features[invoice-history][enabled]=true \
  --features[payment-method-update][enabled]=true \
  --features[subscription-cancel][enabled]=true \
  --features[subscription-cancel][mode]=at_period_end \
  --features[subscription-cancel][cancellation-reason][enabled]=true \
  --features[subscription-cancel][cancellation-reason][options][]=too_expensive \
  --features[subscription-cancel][cancellation-reason][options][]=missing_features \
  --features[subscription-cancel][cancellation-reason][options][]=switched_service \
  --features[subscription-cancel][cancellation-reason][options][]=unused \
  --features[subscription-cancel][cancellation-reason][options][]=other \
  --default-return-url "https://app.coachdm.be/account" \
  > /dev/null
echo -e "${GREEN}  ✓ Customer Portal configuré${NC}"

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ STRIPE LIVE READY${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "  Produit  : $PRODUCT_ID"
echo "  Prix     : $PRICE_ID (19.99€/mois, trial 7j)"
echo "  Webhook  : $WEBHOOK_ID"
echo "  → Config sauvegardée dans .stripe-prod-config (chmod 600)"
echo
echo -e "${GOLD}  ⚠ ACTIONS MANUELLES STRIPE DASHBOARD :${NC}"
echo "    1. Compléter Business profile (Belgique, BCE BE0840.260.421)"
echo "    2. Configurer la TVA (Stripe Tax) selon ton statut"
echo "    3. Activer Strong Customer Authentication (SCA) — requis EU"
echo "    4. Vérifier que les emails Stripe sont en FR (Settings → Branding)"
echo
echo -e "${GOLD}  → Prochaine étape : bash 04-vercel-deploy.sh${NC}"
