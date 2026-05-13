#!/usr/bin/env bash
# ============================================================
# COACH DM — Healthcheck endpoints production
# Usage: bash healthcheck.sh
# À programmer en cron externe (UptimeRobot, Better Uptime) chaque 5min
# ============================================================
set -uo pipefail   # PAS de -e : on veut continuer même si un check échoue

OK="\033[0;32m✓\033[0m"
KO="\033[0;31m✗\033[0m"
WARN="\033[0;33m⚠\033[0m"

DOMAIN="${DOMAIN:-app.coachdm.be}"
SITE="${SITE:-coachdm.be}"
SUPABASE_REF="${SUPABASE_REF:-}"

check() {
  local label=$1
  local url=$2
  local expected=${3:-200}

  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$url" || echo "000")

  if [ "$code" = "$expected" ]; then
    echo -e "  ${OK} $label ($code)"
    return 0
  else
    echo -e "  ${KO} $label ($code, attendu $expected) — $url"
    return 1
  fi
}

ERRORS=0

echo "▶ Web"
check "Site marketing"   "https://$SITE"                || ERRORS=$((ERRORS+1))
check "App home"          "https://$DOMAIN"              || ERRORS=$((ERRORS+1))
check "App health"        "https://$DOMAIN/api/health"   || ERRORS=$((ERRORS+1))
check "Privacy"           "https://$SITE/privacy.html"   || ERRORS=$((ERRORS+1))
check "CGV"               "https://$SITE/cgv.html"       || ERRORS=$((ERRORS+1))

echo
echo "▶ Supabase"
if [ -n "$SUPABASE_REF" ]; then
  check "Supabase REST"  "https://${SUPABASE_REF}.supabase.co/rest/v1/"   401 || ERRORS=$((ERRORS+1))
  check "Supabase Auth"  "https://${SUPABASE_REF}.supabase.co/auth/v1/health"  || ERRORS=$((ERRORS+1))
else
  echo -e "  ${WARN} SUPABASE_REF non défini, skip"
fi

echo
echo "▶ Universal links"
check ".well-known/apple-app-site-association" "https://$DOMAIN/.well-known/apple-app-site-association" || ERRORS=$((ERRORS+1))
check ".well-known/assetlinks.json"            "https://$DOMAIN/.well-known/assetlinks.json"            || ERRORS=$((ERRORS+1))

echo
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${OK} Tous les checks OK"
  exit 0
else
  echo -e "${KO} $ERRORS check(s) échoué(s) — incident probable"
  exit 1
fi
