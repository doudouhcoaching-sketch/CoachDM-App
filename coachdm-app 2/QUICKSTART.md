# ⚡ Coach DM — Quickstart (15 minutes)

Pour passer du clone du repo à un environnement local fonctionnel.

## 1. Setup (3 min)

```bash
git clone <repo> coachdm-app
cd coachdm-app
npm install
```

## 2. Supabase local (5 min)

```bash
# Démarre Postgres + Auth + Storage en local
supabase start

# Push les migrations
supabase db reset

# Récupère les URL/keys locales (s'affichent dans le terminal)
# Format : 
#   API URL: http://localhost:54321
#   anon key: eyJhbGc...
#   service_role: eyJhbGc...
```

## 3. Variables d'environnement (2 min)

**`apps/web/.env.local`** :

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>

STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=<from stripe listen>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_PRICE_ID_MONTHLY=price_xxx
STRIPE_TRIAL_DAYS=7

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://coachdm.be
```

**`apps/mobile/.env.local`** :

```
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
```

⚠️ **Mobile + Supabase local** : il faut que ton téléphone puisse atteindre `localhost`. Soit :
- Utilise l'IP locale de ton Mac : `http://192.168.x.x:54321`
- Soit utilise directement le projet Supabase cloud dès le départ (plus simple)

## 4. Lancer (5 min)

```bash
# Terminal 1 — Web
npm run dev:web

# Terminal 2 — Mobile  
npm run dev:mobile

# Terminal 3 — Stripe webhook
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 5. Premier test

1. Ouvre `http://localhost:3000`
2. **Sign up** avec un email de test (le `supabase start` n'envoie pas vraiment d'email, l'utilisateur est confirmé direct)
3. Tu arrives sur `/app` → bouton "Démarrer essai gratuit"
4. Stripe Checkout en mode test → carte `4242 4242 4242 4242`
5. Retour sur `/app?checkout=success` → abonnement `trialing` actif
6. Sur ton téléphone (Expo Go) : login avec le même compte → onboarding 4 étapes → dashboard nutrition

## Bug fréquent

**"Module @coachdm/shared not found"** → 
```bash
cd apps/mobile  # ou apps/web
rm -rf node_modules .expo .next
cd ../..
npm install
```

Le monorepo nécessite parfois une réinstallation propre.

---

Pour le déploiement production complet, voir [README.md](./README.md).
