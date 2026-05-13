#!/usr/bin/env bash
# ============================================================
# COACH DM — PHASE 8 · 04 VERCEL DEPLOY (app.coachdm.be)
# Déploie le workspace web/ vers Vercel production
# Usage: bash 04-vercel-deploy.sh [--prod]
# Prérequis: vercel CLI, $VERCEL_TOKEN, etapes 01-03 OK
# ============================================================
set -euo pipefail

GOLD="\033[0;33m"
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo -e "${RED}✗ VERCEL_TOKEN non défini.${NC}"
  echo "  Génère sur vercel.com/account/tokens"
  exit 1
fi

if [ ! -f ".supabase-prod-keys" ] || [ ! -f ".stripe-prod-config" ]; then
  echo -e "${RED}✗ Clés Supabase ou Stripe manquantes. Lance 01-03 d'abord.${NC}"
  exit 1
fi

# Charger les clés
set -a
source .supabase-prod-keys
source .stripe-prod-config
set +a

WEB_DIR="${WEB_DIR:-./apps/web}"
DOMAIN="${DOMAIN:-app.coachdm.be}"
TEAM="${VERCEL_TEAM:-}"

if [ ! -d "$WEB_DIR" ]; then
  echo -e "${RED}✗ $WEB_DIR introuvable. Adapte WEB_DIR=/path/to/web${NC}"
  exit 1
fi

echo -e "${GOLD}▶ Vercel deploy → $DOMAIN${NC}"
cd "$WEB_DIR"

# 1. Link projet Vercel
echo -e "${GOLD}  → Link projet${NC}"
vercel link --yes --token "$VERCEL_TOKEN" ${TEAM:+--scope "$TEAM"}

# 2. Push env vars production
echo -e "${GOLD}  → Push environment variables (production)${NC}"

push_env() {
  local key=$1
  local value=$2
  local env_type=${3:-production}
  echo "$value" | vercel env add "$key" "$env_type" --token "$VERCEL_TOKEN" --force >/dev/null 2>&1 || \
    echo "$value" | vercel env add "$key" "$env_type" --token "$VERCEL_TOKEN" >/dev/null
  echo -e "${GREEN}    ✓ $key${NC}"
}

push_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
push_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
push_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
push_env "NEXT_PUBLIC_STRIPE_PRICE_ID" "$STRIPE_PRICE_ID"
push_env "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY_LIVE"
push_env "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
push_env "NEXT_PUBLIC_APP_URL" "https://$DOMAIN"
push_env "NEXT_PUBLIC_BRAND" "Coach DM"
push_env "NEXT_PUBLIC_BCE" "BE0840.260.421"

if [ -n "${SENTRY_DSN_WEB:-}" ]; then
  push_env "NEXT_PUBLIC_SENTRY_DSN" "$SENTRY_DSN_WEB"
  push_env "SENTRY_AUTH_TOKEN" "${SENTRY_AUTH_TOKEN:-}"
  push_env "SENTRY_ORG" "${SENTRY_ORG:-coachdm}"
  push_env "SENTRY_PROJECT" "${SENTRY_PROJECT_WEB:-coachdm-web}"
fi

# 3. Build & deploy
echo -e "${GOLD}  → Production build & deploy${NC}"
DEPLOY_URL=$(vercel deploy --prod --token "$VERCEL_TOKEN" --yes)
echo -e "${GREEN}  ✓ Deployed : $DEPLOY_URL${NC}"

# 4. Alias custom domain
echo -e "${GOLD}  → Alias → $DOMAIN${NC}"
vercel alias set "$DEPLOY_URL" "$DOMAIN" --token "$VERCEL_TOKEN" || {
  echo -e "${RED}  ⚠ Alias échoué — vérifier que le DNS pointe bien${NC}"
  echo "    Records à créer (voir vercel/dns-records.md) :"
  echo "      CNAME  app  →  cname.vercel-dns.com."
}

# 5. Healthcheck
echo -e "${GOLD}  → Healthcheck${NC}"
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}  ✓ https://$DOMAIN/api/health → 200${NC}"
else
  echo -e "${RED}  ⚠ https://$DOMAIN/api/health → $HTTP_CODE${NC}"
  echo "    Vérifier propagation DNS (peut prendre 5-30min)"
fi

cd - >/dev/null

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ VERCEL DEPLOY OK${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "  URL prod : https://$DOMAIN"
echo "  Build    : $DEPLOY_URL"
echo
echo -e "${GOLD}  → Prochaine étape : bash 05-eas-build.sh${NC}"
