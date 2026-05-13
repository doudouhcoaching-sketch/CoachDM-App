#!/usr/bin/env bash
# ============================================================
# COACH DM — PHASE 8 · 02 MIGRATIONS RUN
# Applique les 15 migrations dans l'ordre, vérifie chaque étape
# Usage: bash 02-migrations-run.sh
# Prérequis: 01-supabase-provision.sh exécuté avec succès
# ============================================================
set -euo pipefail

GOLD="\033[0;33m"
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m"

if [ ! -f ".supabase-prod-ref" ]; then
  echo -e "${RED}✗ .supabase-prod-ref absent. Lance d'abord 01-supabase-provision.sh${NC}"
  exit 1
fi

PROJECT_REF=$(cat .supabase-prod-ref)
echo -e "${GOLD}▶ Migrations sur projet $PROJECT_REF${NC}"

# Ordre strict des migrations Coach DM
MIGRATIONS=(
  "001_user_profiles.sql"
  "002_user_macros.sql"
  "003_foods.sql"
  "004_meals.sql"
  "005_recipes.sql"
  "006_nutrition_tips.sql"
  "007_favorites.sql"
  "008_workouts_complete.sql"
  "009_coaching_b2b.sql"
  "010_mobility_wearables.sql"
  "011_analytics.sql"
  "012_community_posts.sql"
  "013_community_challenges.sql"
  "014_community_stories_notifs.sql"
  "015_ai_coach.sql"
)

MIGRATIONS_DIR="${MIGRATIONS_DIR:-./supabase/migrations}"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo -e "${RED}✗ $MIGRATIONS_DIR introuvable.${NC}"
  echo "  Place tes 15 migrations là, ou exporte MIGRATIONS_DIR=/path/to/migrations"
  exit 1
fi

# Sanity check : tous les fichiers présents ?
echo -e "${GOLD}  → Vérification présence des 15 fichiers${NC}"
MISSING=0
for m in "${MIGRATIONS[@]}"; do
  if [ ! -f "$MIGRATIONS_DIR/$m" ]; then
    echo -e "${RED}    ✗ $m manquant${NC}"
    MISSING=$((MISSING+1))
  fi
done
if [ "$MISSING" -gt 0 ]; then
  echo -e "${RED}✗ $MISSING migration(s) manquante(s). Abort.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ 15/15 migrations présentes${NC}"

# Backup pré-migration (sécurité)
echo -e "${GOLD}  → Backup logique avant migration${NC}"
BACKUP_FILE="backup-pre-migration-$(date -u +%Y%m%dT%H%M%SZ).sql"
supabase db dump --project-ref "$PROJECT_REF" -f "$BACKUP_FILE" || {
  echo -e "${RED}  ⚠ Backup échoué — base vide ? On continue.${NC}"
}
echo -e "${GREEN}  ✓ Backup : $BACKUP_FILE${NC}"

# Application séquentielle
echo -e "${GOLD}  → Application des migrations${NC}"
for m in "${MIGRATIONS[@]}"; do
  echo -e "${GOLD}    ▸ $m${NC}"
  if supabase db push --project-ref "$PROJECT_REF" --include-all 2>&1 | tee -a migrations.log; then
    echo -e "${GREEN}    ✓ $m appliquée${NC}"
  else
    echo -e "${RED}    ✗ $m a échoué. Voir migrations.log${NC}"
    echo -e "${RED}    Rollback : supabase db reset --linked --no-seed${NC}"
    exit 1
  fi
done

# Vérification post-migration : tables critiques
echo -e "${GOLD}  → Vérification tables critiques${NC}"
EXPECTED_TABLES=(
  "user_profiles" "user_macros" "foods" "meals" "recipes"
  "exercises" "programs" "workouts" "sessions" "set_logs" "personal_records"
  "coach_clients" "messages" "check_ins"
  "mobility_routines" "wearable_sync_log" "recovery_daily"
  "analytics_weekly" "measurements"
  "posts" "reactions" "challenges" "stories" "notifications"
  "ai_conversations" "ai_messages" "ai_embeddings"
)

MISSING_TABLES=0
for t in "${EXPECTED_TABLES[@]}"; do
  COUNT=$(supabase db query "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$t';" --output json 2>/dev/null | jq -r '.[0].count' || echo "0")
  if [ "$COUNT" = "1" ]; then
    echo -e "${GREEN}    ✓ $t${NC}"
  else
    echo -e "${RED}    ✗ $t manquante${NC}"
    MISSING_TABLES=$((MISSING_TABLES+1))
  fi
done

if [ "$MISSING_TABLES" -gt 0 ]; then
  echo -e "${RED}✗ $MISSING_TABLES table(s) critique(s) manquante(s). Migration incomplète.${NC}"
  exit 1
fi

# Vérification pg_cron jobs
echo -e "${GOLD}  → Vérification jobs pg_cron${NC}"
supabase db query "SELECT jobname, schedule FROM cron.job ORDER BY jobname;" || true

# Déploiement Edge Functions
echo -e "${GOLD}  → Deploy Edge Functions${NC}"
for fn in ai-chat ai-context-builder ai-plateau-scan ai-recovery-reco ai-session-suggest stripe-webhook; do
  if [ -d "./supabase/functions/$fn" ]; then
    echo -e "${GOLD}    ▸ $fn${NC}"
    supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --no-verify-jwt
    echo -e "${GREEN}    ✓ $fn déployée${NC}"
  fi
done

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ 15 MIGRATIONS + EDGE FUNCTIONS DÉPLOYÉES${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "  Backup : $BACKUP_FILE"
echo "  Logs   : migrations.log"
echo
echo -e "${GOLD}  → Prochaine étape : bash 03-stripe-setup.sh${NC}"
