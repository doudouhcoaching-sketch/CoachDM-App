# 🏆 Coach DM — App Fitness & Nutrition Premium

> **Coach DM** est une app fitness premium construite par Doudouh M.,
> coach certifié (12 certifications). L'app remplace le tracker
> nutrition générique par une expérience de précision : macros calculés
> sur-mesure (Mifflin-St Jeor / Katch-McArdle), scan code-barres
> illimité (OpenFoodFacts), évolution poids et objectifs adaptés.
>
> **Tarification** : 19,99 €/mois après **7 jours d'essai gratuit**.

---

## 🗺️ Architecture générale

```
coachdm-app/
├── apps/
│   ├── web/              # Next.js 15 (landing + back-office coach + Stripe)
│   └── mobile/           # Expo SDK 52 (app cliente iOS + Android)
├── packages/
│   └── shared/           # Logique commune (types, calculs, OFF, i18n, validators)
├── supabase/
│   ├── config.toml       # Config CLI locale
│   └── migrations/       # 4 migrations SQL versionnées
├── package.json          # npm workspaces
└── turbo.json            # Cache builds
```

**Stack** : TypeScript strict · Next.js 15 (App Router, RSC) · React Native (New Architecture) · Supabase (Postgres 15 + Auth + Storage + RLS) · Stripe Subscriptions · OpenFoodFacts API · Tailwind CSS · Reanimated 3 · React Query.

---

## ⚙️ Prérequis

| Outil | Version min | Pourquoi |
|---|---|---|
| **Node.js** | 20 LTS | Next.js 15 + Expo SDK 52 |
| **npm** | 10+ | Workspaces |
| **Supabase CLI** | 1.200+ | Push migrations, local stack |
| **Stripe CLI** | 1.20+ | Test webhooks en local |
| **EAS CLI** | latest | Build iOS/Android via cloud |
| **Xcode** (Mac) | 15+ | Build iOS local (optionnel) |
| **Android Studio** | latest | Build Android local (optionnel) |

```bash
# Install
npm install -g supabase
brew install stripe/stripe-cli/stripe   # macOS
npm install -g eas-cli
```

---

## 🚀 Déploiement étape par étape

### Étape 1 — Cloner et installer

```bash
git clone <repo-url> coachdm-app
cd coachdm-app
npm install
```

L'install prend ~3 min (Expo + Next.js + Supabase ont chacun beaucoup de deps).

### Étape 2 — Supabase

#### 2.1 — Créer le projet

1. Va sur [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. **Region** : `eu-west-3 (Paris)` ou `eu-central-1 (Frankfurt)` (RGPD + latence)
3. **Database password** : génère un password fort, **stocke-le** (KeePass, 1Password)
4. Plan **Free** suffit pour démarrer (jusqu'à 50 000 MAU). Passe en **Pro (25 $/mois)** quand tu dépasses 1000 abonnés actifs.

#### 2.2 — Récupérer les clés

Dashboard → **Settings → API** :

| Variable | Où la trouver | Usage |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Web + mobile (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public | Web + mobile (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role | **Web uniquement, JAMAIS exposé** |

#### 2.3 — Push les migrations

```bash
supabase login
supabase link --project-ref <ton-project-ref>
supabase db push
```

Cela exécute en ordre :
- `0001_initial_schema.sql` — tables + triggers + types
- `0002_rls_policies.sql` — Row Level Security
- `0003_views_functions.sql` — `get_daily_dashboard()`, `search_foods()`
- `0004_seed_foods.sql` — 30 aliments de base FR/EN/NL

#### 2.4 — Configurer Auth

Dashboard → **Authentication → URL Configuration** :

```
Site URL:                https://app.coachdm.be
Redirect URLs (whitelist) :
  - https://app.coachdm.be/auth/callback
  - http://localhost:3000/auth/callback
  - coachdm://auth-callback
  - exp://localhost:8081
```

→ **Email Templates** : personnalise au moins le template "Confirm signup" en français pour respecter le branding Coach DM.

→ **Providers** : laisse Email activé. Active Apple Sign-In quand tu publieras sur l'App Store (obligatoire si tu offres d'autres providers, sinon optionnel).

#### 2.5 — Storage buckets

Dashboard → **Storage** : crée les 3 buckets définis dans `config.toml` :

- `avatars` (public, 2 MB max)
- `progress-photos` (privé, 10 MB max)
- `foods` (public, 1 MB max)

#### 2.6 — Régénérer les types TypeScript

```bash
npm run supabase:types
# → écrit packages/shared/src/database.types.ts
```

À refaire après chaque nouvelle migration.

### Étape 3 — Stripe

#### 3.1 — Créer le compte business

1. [dashboard.stripe.com/register](https://dashboard.stripe.com/register) avec ton email pro Coach DM
2. Mode **business** → Belgique → catégorie "Health, fitness, beauty"
3. Active le compte (KYC) : SIRET/BCE belge, IBAN, justificatif d'identité
4. Active la **TVA OSS** : Settings → **Tax** → "Enable automatic tax calculation". C'est ce qui te permet de vendre dans toute l'Europe sans gérer 27 régimes TVA différents.

#### 3.2 — Créer le produit

Dashboard → **Products → + Add product** :

```
Name:           Coach DM Premium
Description:    Tracking nutrition, macros sur-mesure, scan code-barres
Pricing model:  Recurring → Monthly
Price:          19.99 EUR
Tax behavior:   Inclusive (TVA incluse, conformément UE B2C)
```

Copie le **Price ID** (commence par `price_`) → c'est ton `STRIPE_PRICE_ID_MONTHLY`.

#### 3.3 — Configurer le Customer Portal

Dashboard → **Settings → Billing → Customer portal** :

- ✅ Cancel subscriptions (à la fin de la période)
- ✅ Update payment method
- ✅ Update billing address & VAT
- ✅ View invoice history
- ❌ Switch plans (un seul plan)
- Locales : Français + Anglais + Néerlandais

#### 3.4 — Créer le webhook

**En production** : Dashboard → **Developers → Webhooks → Add endpoint**

```
Endpoint URL:    https://app.coachdm.be/api/stripe/webhook
Events to send:  
  - checkout.session.completed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed
```

Copie le **Signing secret** (commence par `whsec_`) → `STRIPE_WEBHOOK_SECRET`.

**En local** (test) :

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Affiche le whsec_xxxxx local — colle-le dans .env.local
```

### Étape 4 — Vercel (web)

#### 4.1 — Déployer

```bash
cd apps/web
vercel --prod
```

Vercel détecte Next.js automatiquement. Au premier deploy, il te demandera de lier le projet.

#### 4.2 — Configurer les variables d'environnement

Vercel Dashboard → Project → **Settings → Environment Variables** :

```
NEXT_PUBLIC_SUPABASE_URL          = (étape 2.2)
NEXT_PUBLIC_SUPABASE_ANON_KEY     = (étape 2.2)
SUPABASE_SERVICE_ROLE_KEY         = (étape 2.2)  ⚠️ Production + Preview, jamais Development public
STRIPE_SECRET_KEY                 = sk_live_xxxxx
STRIPE_WEBHOOK_SECRET             = whsec_xxxxx (étape 3.4)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= pk_live_xxxxx
STRIPE_PRICE_ID_MONTHLY           = price_xxxxx (étape 3.2)
STRIPE_TRIAL_DAYS                 = 7
NEXT_PUBLIC_APP_URL               = https://app.coachdm.be
NEXT_PUBLIC_SITE_URL              = https://coachdm.be
```

#### 4.3 — Brancher le domaine custom

Vercel → **Settings → Domains → Add** : `app.coachdm.be`

Vercel te donne un enregistrement DNS à ajouter chez ton registrar (probablement Namecheap, OVH, ou GitHub Pages — selon où coachdm.be est hébergé) :

```
Type   Name    Value
CNAME  app     cname.vercel-dns.com
```

Le SSL Let's Encrypt est automatique (~5 min après propagation DNS).

### Étape 5 — App mobile (Expo)

#### 5.1 — Initialiser EAS

```bash
cd apps/mobile
eas login
eas init        # Crée le project ID dans app.json
```

#### 5.2 — Variables d'environnement Expo

Crée `apps/mobile/.env.local` :

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
```

⚠️ **Important** : Les variables `EXPO_PUBLIC_*` sont **embarquées dans le bundle** et accessibles publiquement. C'est OK pour anon_key et URL (protégés par RLS). **Jamais** mettre `SUPABASE_SERVICE_ROLE_KEY` côté mobile.

#### 5.3 — Tester en local (Expo Go)

```bash
npx expo start
# Scanne le QR avec Expo Go (iOS/Android)
```

Note : le scan code-barres ne fonctionne pas dans Expo Go (besoin du build natif).

#### 5.4 — Build de production

**Configurer EAS Build** — `apps/mobile/eas.json` :

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "production": {
      "channel": "production",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://xxxxx.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJxxxxx"
      },
      "ios": { "autoIncrement": "buildNumber" },
      "android": { "autoIncrement": "versionCode" }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "[email protected]", "ascAppId": "..." },
      "android": { "serviceAccountKeyPath": "./pc-api-key.json" }
    }
  }
}
```

Puis :

```bash
# iOS (nécessite compte Apple Developer 99 $/an)
eas build --platform ios --profile production
eas submit --platform ios

# Android (compte Google Play 25 $ one-time)
eas build --platform android --profile production
eas submit --platform android
```

#### 5.5 — Soumission App Store / Play Store

**App Store** :
- Compte Apple Developer : [developer.apple.com/programs](https://developer.apple.com/programs/) (99 $/an)
- App Store Connect → New App → bundle id `be.coachdm.app`
- Captures écran : iPhone 15 Pro Max (6.7"), iPhone 8 Plus (5.5"), iPad Pro 12.9"
- Description en FR + EN + NL (réutilise les 3 traductions de l'app)
- Catégorie : **Health & Fitness**
- Politique de confidentialité : URL `https://coachdm.be/privacy`

**Google Play** :
- Compte Google Play Console : 25 $ one-time
- Internal testing d'abord (track ouvert dès le 1er upload)
- Production après ~7 jours de tests

---

## 🧪 Tester en local

### Lancer le stack complet

```bash
# Terminal 1 — Supabase local (Postgres + Auth + Storage)
supabase start

# Terminal 2 — Web Next.js
npm run dev:web
# → http://localhost:3000

# Terminal 3 — Mobile Expo
npm run dev:mobile
# → Expo Dev Tools

# Terminal 4 — Stripe webhook (test paiements)
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Données de test Stripe

Carte de test : `4242 4242 4242 4242`, n'importe quelle date future, CVC `123`.

D'autres scénarios :
- Carte refusée : `4000 0000 0000 0002`
- 3D Secure obligatoire : `4000 0027 6000 3184`
- Trial qui expire avec échec paiement : crée la sub puis fais expirer la carte

### Premier compte coach

Après ton premier signup (devient un client par défaut), passe-toi en coach via Supabase :

```sql
-- Dans Supabase SQL Editor
update public.profiles
set role = 'coach'
where email = '[email protected]';
```

Puis recharge `/app` → tu verras apparaître l'onglet "Coach" qui mène à `/coach`.

---

## 🛡️ Sécurité — checklist avant production

- [ ] **RLS activé sur toutes les tables** (déjà fait dans `0002_rls_policies.sql`)
- [ ] **Service role key jamais côté client** (pas dans Expo, pas dans le browser)
- [ ] **Webhook signature vérifiée** (`stripe.webhooks.constructEvent`)
- [ ] **Rate limiting** : active Vercel Edge Config ou Upstash pour limiter `/api/*`
- [ ] **CSP headers** : déjà configurés dans `next.config.js`
- [ ] **Politique RGPD** : crée la page `/privacy` sur `coachdm.be` (suppression compte sur demande, export données)
- [ ] **Backup Supabase** : automatique en plan Pro, à activer manuellement en Free
- [ ] **Supabase service role rotation** : tous les 6 mois
- [ ] **Apple Sign-In** : obligatoire dès qu'un autre OAuth provider est activé sur l'App Store

---

## 📈 Monétisation — modèle abonnement seul

**Tarif unique : 19,99 €/mois après 7 jours gratuits.**

Projection réaliste à 12 mois (basée sur conversion moyenne fitness apps) :

| Mois | Trials/mois | Conversion 25% | Abonnés cumulés | MRR |
|---|---|---|---|---|
| M1 | 30 | 7 | 7 | 140 € |
| M3 | 80 | 20 | 50 | 1 000 € |
| M6 | 150 | 37 | 130 | 2 600 € |
| M12 | 250 | 62 | 350 | 7 000 € |

**Leviers d'acquisition** identifiés :
1. **Coachdm.be** (SEO existant) → bouton "Télécharger l'app" en hero
2. **Instagram @coachdm.be** (priorité actuelle d'avril 2026) → bio link vers `app.coachdm.be`
3. **Acheteurs PDFs Payhip** → email de bienvenue avec code promo `WELCOME50` (50% premier mois Stripe)
4. **Ads Meta/TikTok** : à activer une fois 50 abonnés naturels (signal de PMF)

**Coûts mensuels** estimés à 350 abonnés :
- Supabase Pro : 25 €
- Vercel Pro : 20 €
- Stripe : ~3% des revenus = 210 €
- Apple : 30% (15% après an 1) sur les paiements via App Store IAP (uniquement)
- Apple Developer + Google Play : 100 € amortis
- **Marge nette estimée : ~80% des revenus** (paiement web Stripe direct)

⚠️ **Stratégie iOS** : pour éviter les 30% Apple, le checkout se fait sur le web. L'app mobile redirige vers `app.coachdm.be/subscribe` (Apple autorise les "Reader Apps" à le faire depuis 2024). Si tu veux activer l'IAP plus tard pour fluidifier, intègre RevenueCat (1% de fee, gère iOS+Android+Stripe).

---

## 🛠️ Phase 2-4 — Roadmap features

L'app actuelle est la **Phase 1 (Nutrition)** demandée. Voici les phases suivantes, déjà préparées dans le schéma DB et le design system :

### Phase 2 — Workouts (4-6 semaines)
- Banque d'exercices vidéo (~120 mouvements de ta bibliothèque YouTube)
- Workout du jour (template basé sur les 21 PDFs existants)
- Logger de séance (sets, reps, charge, RPE)
- Tables à créer : `exercises`, `workouts`, `workout_sessions`, `set_logs`

### Phase 3 — Coach features (3-4 semaines)
- Messagerie coach ↔ client
- Check-ins hebdo (photos, mensurations, ressenti)
- Plans personnalisés assignés par toi
- Tables à créer : `messages`, `check_ins`, `assigned_plans`

### Phase 4 — Mobilité & extras (2-3 semaines)
- Programmes mobilité quotidiens (FRC, ROM, articulation par articulation)
- Recettes (table `recipes` déjà préparée)
- Hydratation avancée (timer de rappels)
- Wearable sync (Apple Health, Google Fit)

**Total Phase 2-4** : ~12 semaines de dev solo, ou 6 semaines avec un dev junior.

---

## 📞 Contact & support

- **Site Coach DM** : [coachdm.be](https://coachdm.be)
- **Instagram** : [@coachdm.be](https://instagram.com/coachdm.be)
- **Email** : [[email protected]](mailto:[email protected])
- **BCE** : BE0840.260.421

---

## 📜 Licence

Privé — © Coach DM, Doudouh M. Tous droits réservés.

---

**Construit avec ❤️ pour Coach DM. Power · Transform · Excel.**
