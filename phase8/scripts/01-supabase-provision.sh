#!/usr/bin/env bash
# ============================================================
# COACH DM — PHASE 8 · 01 SUPABASE PROD PROVISIONING
# Crée/lie le projet Supabase prod eu-west-3 et applique secrets
# Usage: bash 01-supabase-provision.sh
# Prérequis: supabase CLI v1.150+, $SUPABASE_ACCESS_TOKEN
# ============================================================
set -euo pipefail

GOLD="\033[0;33m"
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m"

PROJECT_NAME="coachdm-prod"
REGION="eu-west-3"          # Paris — RGPD-compliant
DB_PASSWORD="${DB_PASSWORD:-}"
ORG_ID="${SUPABASE_ORG_ID:-}"

echo -e "${GOLD}▶ Supabase prod provisioning (${REGION})${NC}"

if [ -z "$DB_PASSWORD" ]; then
  echo -e "${RED}✗ DB_PASSWORD non défini. Génère un mot de passe fort (>32 chars) et exporte-le:${NC}"
  echo "    export DB_PASSWORD=\"\$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)\""
  exit 1
fi

if [ -z "$ORG_ID" ]; then
  echo -e "${RED}✗ SUPABASE_ORG_ID non défini.${NC}"
  echo "  Récupère-le avec: supabase orgs list"
  exit 1
fi

# 1. Créer le projet (ou skip si déjà existant)
echo -e "${GOLD}  → Création du projet $PROJECT_NAME${NC}"
if supabase projects list | grep -q "$PROJECT_NAME"; then
  echo -e "${GREEN}  ✓ Projet déjà existant${NC}"
  PROJECT_REF=$(supabase projects list --output json | jq -r ".[] | select(.name==\"$PROJECT_NAME\") | .id")
else
  PROJECT_REF=$(supabase projects create "$PROJECT_NAME" \
    --org-id "$ORG_ID" \
    --region "$REGION" \
    --db-password "$DB_PASSWORD" \
    --output json | jq -r '.id')
  echo -e "${GREEN}  ✓ Projet créé : $PROJECT_REF${NC}"
fi

echo "$PROJECT_REF" > .supabase-prod-ref
echo -e "${GOLD}  → PROJECT_REF sauvegardé dans .supabase-prod-ref${NC}"

# 2. Link local au projet
echo -e "${GOLD}  → Linking local CLI${NC}"
supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"

# 3. Activer extensions requises
echo -e "${GOLD}  → Activation extensions (pgvector, pg_cron, pg_net, uuid-ossp)${NC}"
cat <<SQL | supabase db query
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "vector";
SQL

# 4. Pousser les secrets vers les Edge Functions
echo -e "${GOLD}  → Push secrets Edge Functions${NC}"
if [ -f "./supabase/secrets.env" ]; then
  supabase secrets set --env-file ./supabase/secrets.env
  echo -e "${GREEN}  ✓ Secrets pushed${NC}"
else
  echo -e "${RED}  ✗ ./supabase/secrets.env introuvable.${NC}"
  echo "    Copie supabase/secrets.example.env → supabase/secrets.env et remplis."
  exit 1
fi

# 5. Récupérer les URLs et clés
echo -e "${GOLD}  → Récupération URL + clés${NC}"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
ANON_KEY=$(supabase projects api-keys --project-ref "$PROJECT_REF" --output json | jq -r '.[] | select(.name=="anon") | .api_key')
SERVICE_KEY=$(supabase projects api-keys --project-ref "$PROJECT_REF" --output json | jq -r '.[] | select(.name=="service_role") | .api_key')

cat <<EOF > .supabase-prod-keys
# === GENERATED $(date -u +%Y-%m-%dT%H:%M:%SZ) ===
# NE PAS COMMIT. Ajoute à .gitignore.
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
PROJECT_REF=$PROJECT_REF
EOF

chmod 600 .supabase-prod-keys

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ SUPABASE PROD READY${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "  URL: $SUPABASE_URL"
echo "  REF: $PROJECT_REF"
echo "  Clés sauvegardées dans .supabase-prod-keys (chmod 600)"
echo
echo -e "${GOLD}  → Prochaine étape : bash 02-migrations-run.sh${NC}"
