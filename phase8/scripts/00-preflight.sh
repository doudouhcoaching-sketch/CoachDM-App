#!/usr/bin/env bash
# ============================================================
# COACH DM — PHASE 8 · 00 PREFLIGHT
# Vérifie que toutes les dépendances locales sont installées
# Usage: bash 00-preflight.sh
# ============================================================
set -euo pipefail

OK="\033[0;32m✓\033[0m"
KO="\033[0;31m✗\033[0m"
WARN="\033[0;33m⚠\033[0m"
GOLD="\033[0;33m"
NC="\033[0m"

ERRORS=0

echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GOLD}  COACH DM · PHASE 8 · PREFLIGHT CHECK${NC}"
echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

check_cmd() {
  local cmd=$1
  local min_version=${2:-""}
  local install_hint=${3:-""}
  if command -v "$cmd" >/dev/null 2>&1; then
    local version
    version=$("$cmd" --version 2>&1 | head -n1 || echo "unknown")
    echo -e "  ${OK} $cmd ($version)"
  else
    echo -e "  ${KO} $cmd — manquant"
    [ -n "$install_hint" ] && echo -e "      Install: $install_hint"
    ERRORS=$((ERRORS+1))
  fi
}

check_env() {
  local var=$1
  local hint=$2
  if [ -n "${!var:-}" ]; then
    echo -e "  ${OK} \$$var défini"
  else
    echo -e "  ${WARN} \$$var non défini — $hint"
  fi
}

echo "▶ Outils CLI requis"
check_cmd "node" "20.x" "https://nodejs.org/"
check_cmd "npm" "10.x" "ships with node"
check_cmd "git" "" "https://git-scm.com/"
check_cmd "supabase" "1.150+" "npm i -g supabase"
check_cmd "stripe" "1.20+" "https://stripe.com/docs/stripe-cli"
check_cmd "vercel" "33+" "npm i -g vercel"
check_cmd "eas" "13+" "npm i -g eas-cli"
check_cmd "fastlane" "2.220+" "gem install fastlane (ou bundler)"
check_cmd "jq" "" "brew install jq / apt install jq"

echo
echo "▶ Variables d'environnement attendues"
check_env "SUPABASE_ACCESS_TOKEN" "Génère sur supabase.com/dashboard/account/tokens"
check_env "STRIPE_SECRET_KEY_LIVE" "Stripe Dashboard → Developers → API keys (live mode)"
check_env "ANTHROPIC_API_KEY" "console.anthropic.com — pour Edge Function ai-chat"
check_env "VERCEL_TOKEN" "vercel.com/account/tokens"
check_env "EXPO_TOKEN" "expo.dev/accounts/[user]/settings/access-tokens"
check_env "SENTRY_AUTH_TOKEN" "sentry.io/settings/account/api/auth-tokens/"

echo
echo "▶ Node version (Expo SDK 52 requiert Node 20.x)"
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -ge 20 ]; then
  echo -e "  ${OK} Node $(node -v) compatible"
else
  echo -e "  ${KO} Node $(node -v) trop ancien — Expo SDK 52 requiert Node 20+"
  ERRORS=$((ERRORS+1))
fi

echo
echo "▶ Fichiers de config attendus dans le monorepo"
for f in "package.json" "turbo.json" "supabase/config.toml" ".env.example"; do
  if [ -f "$f" ]; then
    echo -e "  ${OK} $f"
  else
    echo -e "  ${WARN} $f manquant (à créer si nécessaire)"
  fi
done

echo
echo "▶ Comptes & paiements à vérifier manuellement"
cat <<EOF
  ${WARN} Apple Developer Program — 99\$/an (apple.com/developer)
  ${WARN} Google Play Console — 25\$ one-time (play.google.com/console)
  ${WARN} Stripe — compte activé en mode live (stripe.com/dashboard)
  ${WARN} Supabase Pro — 25\$/mois recommandé pour prod (supabase.com/pricing)
  ${WARN} Vercel — Hobby gratuit OK pour démarrer, Pro si besoin
  ${WARN} Sentry — Developer gratuit (5k events/mois) suffisant au lancement
EOF

echo
echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "  ${OK} PREFLIGHT OK — Tu peux lancer 01-supabase-provision.sh"
  echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
else
  echo -e "  ${KO} PREFLIGHT KO — $ERRORS erreur(s) à corriger"
  echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi
