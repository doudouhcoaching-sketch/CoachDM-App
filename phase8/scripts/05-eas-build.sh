#!/usr/bin/env bash
# ============================================================
# COACH DM — PHASE 8 · 05 EAS BUILD iOS + Android
# Build .ipa et .aab production-ready
# Usage: bash 05-eas-build.sh [ios|android|all]
# Prérequis: eas CLI, $EXPO_TOKEN, comptes Apple/Google actifs
# ============================================================
set -euo pipefail

GOLD="\033[0;33m"
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m"

TARGET=${1:-all}

if [ -z "${EXPO_TOKEN:-}" ]; then
  echo -e "${RED}✗ EXPO_TOKEN non défini.${NC}"
  echo "  Génère sur expo.dev → Account settings → Access tokens"
  exit 1
fi

MOBILE_DIR="${MOBILE_DIR:-./apps/mobile}"
if [ ! -d "$MOBILE_DIR" ]; then
  echo -e "${RED}✗ $MOBILE_DIR introuvable.${NC}"
  exit 1
fi

cd "$MOBILE_DIR"

# 1. Login EAS
echo -e "${GOLD}▶ EAS login${NC}"
echo "$EXPO_TOKEN" | eas login --token

# 2. Vérifier eas.json
if [ ! -f "eas.json" ]; then
  echo -e "${RED}✗ eas.json absent dans $MOBILE_DIR.${NC}"
  echo "  Copie eas/eas.json du pack."
  exit 1
fi

# 3. Push secrets EAS (API keys mobile)
echo -e "${GOLD}  → Push secrets EAS${NC}"

if [ -f "../../.supabase-prod-keys" ]; then
  set -a; source ../../.supabase-prod-keys; set +a
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "$SUPABASE_URL" --force --non-interactive || true
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "$SUPABASE_ANON_KEY" --force --non-interactive || true
fi

if [ -n "${SENTRY_DSN_MOBILE:-}" ]; then
  eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "$SENTRY_DSN_MOBILE" --force --non-interactive || true
fi

# 4. iOS Build
build_ios() {
  echo -e "${GOLD}▶ iOS production build${NC}"
  echo -e "${GOLD}  → Vérifie que tu as :${NC}"
  echo "      • Apple Developer Account actif"
  echo "      • Bundle ID : be.coachdm.app enregistré sur App Store Connect"
  echo "      • App créée dans App Store Connect (avec SKU coachdm-app)"
  echo
  read -rp "  Prêt ? [yes/no] " confirm
  [ "$confirm" = "yes" ] || { echo "Skip iOS"; return; }

  eas build --platform ios --profile production --non-interactive --wait
  echo -e "${GREEN}  ✓ Build iOS terminé${NC}"
  echo
  echo -e "${GOLD}  → Pour soumettre à TestFlight :${NC}"
  echo "      eas submit -p ios --latest --non-interactive"
}

# 5. Android Build
build_android() {
  echo -e "${GOLD}▶ Android production build${NC}"
  echo -e "${GOLD}  → Vérifie que tu as :${NC}"
  echo "      • Google Play Console actif (25\$ one-time)"
  echo "      • Package name : be.coachdm.app enregistré"
  echo "      • Service account JSON pour upload automatique"
  echo
  read -rp "  Prêt ? [yes/no] " confirm
  [ "$confirm" = "yes" ] || { echo "Skip Android"; return; }

  eas build --platform android --profile production --non-interactive --wait
  echo -e "${GREEN}  ✓ Build Android terminé${NC}"
  echo
  echo -e "${GOLD}  → Pour soumettre Internal Testing :${NC}"
  echo "      eas submit -p android --latest --non-interactive"
}

case "$TARGET" in
  ios)     build_ios ;;
  android) build_android ;;
  all)     build_ios; build_android ;;
  *)       echo -e "${RED}Target inconnu : $TARGET${NC}"; exit 1 ;;
esac

cd - >/dev/null

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ EAS BUILD TERMINÉ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${GOLD}  → Soumissions stores :${NC}"
echo "      iOS:     cd $MOBILE_DIR && eas submit -p ios --latest"
echo "      Android: cd $MOBILE_DIR && eas submit -p android --latest"
echo
echo -e "${GOLD}  → Fastlane metadata (descriptions trilingues) :${NC}"
echo "      ../phase8/fastlane/ios/metadata/"
echo "      ../phase8/fastlane/android/metadata/"
