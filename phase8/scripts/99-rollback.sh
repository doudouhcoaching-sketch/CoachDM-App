#!/usr/bin/env bash
# ============================================================
# COACH DM — PHASE 8 · 99 ROLLBACK URGENCE
# Coupe le webhook Stripe, rollback Vercel, désactive EAS builds
# Usage: bash 99-rollback.sh [vercel|stripe|all]
# ============================================================
set -euo pipefail

GOLD="\033[0;33m"
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m"

TARGET=${1:-all}

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  🚨 ROLLBACK URGENCE — TARGET: $TARGET${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

rollback_vercel() {
  echo -e "${GOLD}▶ Vercel rollback${NC}"
  if [ -z "${VERCEL_TOKEN:-}" ]; then
    echo -e "${RED}  ✗ VERCEL_TOKEN absent${NC}"
    return 1
  fi
  echo "  Liste les 5 derniers déploiements :"
  vercel ls --token "$VERCEL_TOKEN" --yes | head -n 10
  echo
  read -rp "  URL du déploiement stable à promouvoir [https://...] : " STABLE_URL
  vercel promote "$STABLE_URL" --token "$VERCEL_TOKEN" --yes
  echo -e "${GREEN}  ✓ Promotion effectuée${NC}"
}

rollback_stripe() {
  echo -e "${GOLD}▶ Stripe webhook désactivation${NC}"
  if [ ! -f ".stripe-prod-config" ]; then
    echo -e "${RED}  ✗ .stripe-prod-config absent${NC}"
    return 1
  fi
  set -a; source .stripe-prod-config; set +a
  stripe webhook_endpoints update "$STRIPE_WEBHOOK_ID" \
    --api-key "$STRIPE_SECRET_KEY_LIVE" \
    --disabled
  echo -e "${GREEN}  ✓ Webhook $STRIPE_WEBHOOK_ID désactivé${NC}"
  echo -e "${GOLD}  ⚠ Les paiements continuent côté Stripe mais ne sont plus reflétés dans Supabase${NC}"
}

rollback_supabase_migration() {
  echo -e "${GOLD}▶ Supabase rollback dernière migration${NC}"
  if [ ! -f ".supabase-prod-ref" ]; then
    echo -e "${RED}  ✗ .supabase-prod-ref absent${NC}"
    return 1
  fi
  echo -e "${RED}  ⚠ Cette action est destructive. Vérifie d'abord :${NC}"
  echo "      supabase db dump --project-ref \$(cat .supabase-prod-ref) -f rollback-snapshot.sql"
  echo
  read -rp "  Backup fait ? Confirmer rollback ? [I-UNDERSTAND] : " confirm
  [ "$confirm" = "I-UNDERSTAND" ] || { echo "Abort."; return; }
  echo "  Procédure manuelle requise — utilise les backups de 02-migrations-run.sh"
  ls -lh backup-pre-migration-*.sql 2>/dev/null || echo "  Aucun backup local trouvé"
}

case "$TARGET" in
  vercel)   rollback_vercel ;;
  stripe)   rollback_stripe ;;
  supabase) rollback_supabase_migration ;;
  all)
    rollback_vercel
    rollback_stripe
    ;;
  *)
    echo -e "${RED}Target inconnu. Usage: $0 [vercel|stripe|supabase|all]${NC}"
    exit 1
    ;;
esac

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ ROLLBACK TERMINÉ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "  Ouvre docs/INCIDENT-RUNBOOK.md pour la suite des opérations."
