# Coach DM · Phase 3 · Coach Features

Production-ready delivery of the multi-coach platform on top of Phases 1 (Nutrition) and 2 (Workouts).

## Périmètre livré

1. **Messagerie temps réel** — Coach ↔ Client, Realtime Supabase, pièces jointes images, typing indicators via subscriptions.
2. **Check-ins hebdomadaires** — Lundi par défaut, mensurations + ressenti 1-5 + adhérence + photos progression + retour coach.
3. **Plans personnalisés** — Coach assigne un programme catalogue à un client (RPC `assign_program_to_client`) ou crée un plan custom.
4. **Multi-coach B2B** — Toi = super_admin (Doudouh), tu peux accorder/révoquer l'accès coach (payant via Stripe ou comp/free à ta discrétion).

## Structure du livrable

```
phase3/
├─ supabase/
│  ├─ migrations/
│  │  ├─ 010_coach_roles.sql           # Rôles + assignments + helpers RLS
│  │  ├─ 011_messaging.sql             # Threads + messages + Realtime
│  │  ├─ 012_check_ins.sql             # Check-ins hebdo + photos
│  │  ├─ 013_assigned_plans.sql        # Plans personnalisés
│  │  ├─ 014_storage_jobs.sql          # Storage buckets + cron pg_cron
│  │  └─ 015_push_notifications.sql    # Triggers push notifs
│  └─ functions/
│     └─ send-push/index.ts            # Edge function Expo Push
│
├─ packages/shared/src/coach/          # Logique métier partagée
│  ├─ types.ts
│  ├─ messaging.ts
│  ├─ check-ins.ts
│  ├─ management.ts
│  ├─ i18n.ts                          # FR/EN/NL trilingue
│  └─ index.ts
│
├─ apps/mobile/
│  ├─ app/(tabs)/messages.tsx          # Liste threads
│  ├─ app/messages/[id].tsx            # Conversation realtime
│  ├─ app/checkins/index.tsx           # Formulaire check-in client
│  ├─ app/coach/index.tsx              # Dashboard coach
│  ├─ app/coach/clients/index.tsx      # Liste clients (filtres)
│  ├─ app/coach/clients/add.tsx        # Ajouter client
│  ├─ app/coach/clients/[userId].tsx   # Détail client
│  ├─ app/coach/checkins/[id].tsx      # Examen check-in
│  ├─ app/coach/reviews/index.tsx      # File des reviews
│  ├─ app/coach/plans/[id].tsx         # Détail plan (semaines/jours)
│  └─ lib/push.ts                      # Inscription push
│
└─ apps/web/
   ├─ app/admin/coaches/page.tsx       # Gestion abonnements coachs
   ├─ app/admin/clients/page.tsx       # Vue d'ensemble clients
   ├─ app/coach/page.tsx               # Dashboard coach desktop
   └─ app/api/webhooks/coach-stripe/route.ts  # Webhook Stripe coachs
```

## Ordre de déploiement (CRITIQUE)

### 1. Migrations SQL — DANS L'ORDRE

```bash
supabase db push  # ou exécuter manuellement :
psql $DATABASE_URL -f supabase/migrations/010_coach_roles.sql
psql $DATABASE_URL -f supabase/migrations/011_messaging.sql
psql $DATABASE_URL -f supabase/migrations/012_check_ins.sql
psql $DATABASE_URL -f supabase/migrations/013_assigned_plans.sql
psql $DATABASE_URL -f supabase/migrations/014_storage_jobs.sql
psql $DATABASE_URL -f supabase/migrations/015_push_notifications.sql
```

**Important :** la migration 010 promeut `doudouh@coachdm.be` au rôle `super_admin`. Si ton email diffère, modifie la ligne `update public.profiles set role = 'super_admin' where email = ...`.

### 2. Variables d'environnement

**Web (`.env.local`) :**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

STRIPE_SECRET_KEY=sk_live_...
STRIPE_COACH_WEBHOOK_SECRET=whsec_...   # Webhook séparé du webhook abonnés 19.99€
```

**Postgres settings (pour push) :**
```sql
alter database postgres set "app.supabase_url" = 'https://xxx.supabase.co';
alter database postgres set "app.service_role_key" = 'eyJ...';
```

**Mobile (`app.config.ts`) :**
- Ajouter `expo-notifications`, `expo-device` et `expo-image-picker` aux plugins.
- Renseigner `extra.eas.projectId` pour le token push.

### 3. Edge function push

```bash
supabase functions deploy send-push --no-verify-jwt
```

### 4. Stripe — Création des produits coachs

Crée 2 prix dans Stripe pour les coachs (séparés du prix client 19.99€) :
- `coach_pro` — €49/mois
- `coach_pro_annual` — €490/an

Configure un webhook séparé pointant vers `https://app.coachdm.be/api/webhooks/coach-stripe` et utilise son signing secret pour `STRIPE_COACH_WEBHOOK_SECRET`.

Lors du checkout, passe `metadata.coach_user_id` et `metadata.plan` à Stripe.

### 5. Stripe — Webhook events à écouter

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## Modèle de données

### Rôles
- `client` (par défaut) — utilisateur normal
- `coach` — coach payant ou comp/free
- `super_admin` — toi, accès total

### États d'abonnement coach
- `trial` / `active` / `past_due` / `canceled` (payants)
- `comp` / `free` (offerts par toi via `grantCoachAccess`)

### Cycle check-in
1. `pg_cron` crée les check-ins `pending` chaque jour à 08:00 UTC pour les schedules dus.
2. Client remplit + photos + soumet → status `submitted` + message auto au coach.
3. Coach examine + écrit feedback → status `reviewed` + push au client.
4. Schedule.next_due_at incrémenté de +7 jours (hebdo).

## Tests à exécuter

```sql
-- Vérifier que toi = super_admin
select id, email, role from profiles where email = 'doudouh@coachdm.be';

-- Vérifier les RLS helper functions
select is_super_admin();   -- true
select is_coach();         -- true

-- Créer une assignation coach → client (toi vers un test user)
insert into coach_clients (coach_user_id, client_user_id, status)
values (auth.uid(), 'CLIENT_UUID', 'active');

-- Vérifier que le thread auto-créé existe
select * from message_threads where coach_user_id = auth.uid();

-- Vérifier que le check-in schedule a été créé
select * from check_in_schedules where client_user_id = 'CLIENT_UUID';

-- Forcer la création immédiate d'un check-in pending (test)
select create_due_check_ins();
```

## Standards Coach DM respectés

- ✓ **Trilingue FR / EN / NL** sur tous les strings UI (i18n.ts) et toutes les colonnes texte (`title_fr`, `title_en`, `title_nl`, `notes_fr/en/nl`, etc.).
- ✓ **FR en priorité** dans tous les fallbacks et messages auto-générés (notif système, RPC).
- ✓ **Pas de mention d'aliments interdits** — système agnostique côté nutrition (les programmes/recettes sont définis ailleurs).
- ✓ **RLS strict** — un coach ne voit que ses clients ; super_admin voit tout.
- ✓ **Production-ready** — pas de placeholders, gestion d'erreur partout, transactions trigger-safe (idempotents).

## Points d'attention pour la mise en prod

1. **Backup avant migration 010** — la promotion en super_admin écrase le rôle existant.
2. **pg_cron** — l'extension doit être activée dans Supabase (Database → Extensions). Si elle ne l'est pas, le job de création de check-ins n'aura pas lieu et tu devras appeler `create_due_check_ins()` manuellement (ou via un cron externe).
3. **Stripe coach webhook** — séparé du webhook client (sinon collision sur `customer.subscription.updated`). Tu peux les fusionner mais alors différencier par `metadata.tier` (`client` vs `coach`).
4. **Limites push** — Expo limite à 600 notifs/sec par token bucket. Pour 100+ coachs c'est large.
5. **Storage quotas** — bucket `check-in-photos` à 10 MB/photo, `message-attachments` à 25 MB. Ajuste si besoin via le dashboard.

---

Coach DM · Doudouh M. · Reasfit Vilvoorde · BCE BE0840.260.421 · coachdm.be
