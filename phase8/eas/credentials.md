# 🔐 EAS — GESTION DES CREDENTIALS

## iOS — Certificats Apple

EAS gère automatiquement les credentials iOS si tu lui donnes accès à ton compte Apple Developer.

### Setup initial
```bash
cd apps/mobile
eas credentials
# → Choisir iOS
# → Production
# → "Generate new" pour Distribution Certificate
# → "Generate new" pour Provisioning Profile
# → "Generate new" pour Push Notification Key (APNs)
```

### Apple ASC API Key (recommandé pour CI)
1. App Store Connect → Users and Access → Keys (sous Integrations)
2. Generate API Key with Developer access
3. Télécharger le fichier `.p8`
4. Noter : Key ID, Issuer ID
5. Push dans EAS :
```bash
eas credentials
# iOS → App Store Connect API Key → Upload
```

### Bundle ID
- **Identifier** : `be.coachdm.app`
- À créer sur https://developer.apple.com/account/resources/identifiers
- Capabilities à activer : HealthKit, Push Notifications, Associated Domains, Sign in with Apple (recommandé)

## Android — Keystore

### Setup initial (génération auto par EAS)
```bash
cd apps/mobile
eas credentials
# → Choisir Android
# → Production
# → "Generate new keystore" (laisser EAS générer)
```

⚠️ **Sauvegarder la keystore localement** :
```bash
eas credentials
# → Android → Production → "Download keystore"
# Stocker dans un coffre-fort (1Password, etc.)
# SI PERDUE : impossible d'updater l'app sur Play Store, il faudrait re-publier sous un nouveau package
```

### Google Play Service Account
1. Google Cloud Console → IAM & Admin → Service Accounts → Create
2. Nom : `coachdm-play-deploy`
3. Role : aucun (sera donné dans Play Console)
4. Create JSON key → télécharger `google-play-service-account.json`
5. Play Console → Setup → API access → Link Google Cloud project → Grant access au service account
6. Permissions à donner :
   - Admin (toutes apps) ❌ trop large
   - Per-app : Release manager + Financial data viewer ✅

Placer le fichier JSON dans `apps/mobile/google-play-service-account.json` (gitignored).

## Pousser les secrets sensibles dans EAS

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxx.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://...@sentry.io/..."
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "sntrys_..."
```

Lister :
```bash
eas secret:list
```

## Workflow recommandé

### Premier build production
```bash
cd apps/mobile
eas build -p ios --profile production
eas build -p android --profile production
```

### Submit aux stores
```bash
# TestFlight
eas submit -p ios --latest

# Play Internal Testing
eas submit -p android --latest --track internal
```

### Updates OTA (sans rebuild natif)
Les changements purement JS/TS peuvent être pushés instantanément sans repasser par les stores :
```bash
eas update --branch production --message "Fix bug login FR"
```
Limites : impossible de modifier `app.config.ts`, plugins natifs, permissions sans rebuild.

## Versioning automatique

`eas.json` profile production a `autoIncrement: true` → EAS incrémente `buildNumber` (iOS) et `versionCode` (Android) automatiquement à chaque build production.

`version` (1.0.0) à incrémenter manuellement dans `app.config.ts` selon SemVer :
- **Patch** (1.0.x) : bugfix, OTA-friendly
- **Minor** (1.x.0) : nouvelles features, OTA-friendly
- **Major** (x.0.0) : breaking changes, force update

## ⚠️ Sauvegardes critiques (chambre forte)

1. **iOS Distribution Certificate (.p12 + password)**
2. **iOS Push Notification Key (.p8 + Key ID)**
3. **Android Upload Keystore (.jks + password + alias)**
4. **Apple ASC API Key (.p8 + Key ID + Issuer ID)**
5. **Google Play Service Account JSON**

Si tu perds ces fichiers, tu perds la capacité de maintenir l'app. Backup chiffré obligatoire.

---

**Coach DM · Doudouh M. · BCE BE0840.260.421**
