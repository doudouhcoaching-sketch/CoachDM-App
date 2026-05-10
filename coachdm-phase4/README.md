# Coach DM · Phase 4 — Recovery & Habitudes

**Livrée le 10 mai 2026**

Cette phase ajoute le module **Recovery** (sommeil, hydratation, habitudes) au monorepo Coach DM construit en Phases 1-3. Architecture cohérente : Supabase (RLS strict + pg_cron) + Expo (HealthKit iOS + Health Connect Android) + shared package + web admin.

---

## 📦 Contenu de la livraison

### Migrations SQL (4)

| Fichier | Contenu |
|---|---|
| `016_sleep_tracking.sql` | Table `sleep_sessions` (UNIQUE par nuit), trigger durée auto, RLS owner/coach/admin |
| `017_hydration_tracking.sql` | Tables `hydration_targets` + `hydration_entries`, vue `hydration_daily`, init auto à la création de profil |
| `018_habits_tracker.sql` | Tables `habits` (templates) + `habit_logs` (UNIQUE par jour), 10 catégories prédéfinies + custom |
| `019_streaks_gamification.sql` | Table `recovery_streaks`, table `recovery_badges` (12 types), 4 fonctions de calcul, 3 jobs pg_cron |

### Edge Function (1)

`supabase/functions/recovery-reminders/index.ts` — déclenchée toutes les 30 min par pg_cron, envoie les push trilingues FR/EN/NL via Expo Push API.

### Shared package (3 fichiers)

- `packages/shared/src/recovery/types.ts` — typage TS complet
- `packages/shared/src/recovery/calculations.ts` — pure functions (insights, score, streaks, formatters)
- `packages/shared/src/i18n/recovery/index.ts` — dictionnaire FR/EN/NL exhaustif

### Mobile (Expo)

- 5 écrans : RecoveryDashboard · Sleep · Hydration · Habits · Streaks
- HealthBridge (iOS HealthKit + Android Health Connect) + HealthSync (Supabase)
- Composant InsightCard (code couleur Coach DM)
- Hook `usePushRegistration` (canaux Android `recovery` et `coaching`)
- RecoveryNavigator (stack)

### Web admin (Next.js 15)

- `/admin/recovery` — liste de tous les clients du coach avec Recovery Score et streaks
- `/admin/recovery/[clientId]` — détail complet d'un client (sommeil 30j, hydratation 14j, habits 7j)
- `/api/recovery/recompute` — endpoint POST pour forcer un recalcul

---

## 🚀 Installation

### 1. Migrations SQL

```bash
cd supabase
supabase db push
# ou via l'UI Supabase Studio : exécuter dans l'ordre 016 → 017 → 018 → 019
```

⚠️ **Pré-requis** : les Phases 1-3 doivent être déployées. Les RLS s'appuient sur `coach_clients` (Phase 3) et `profiles` (Phase 1).

### 2. Edge Function

```bash
supabase functions deploy recovery-reminders
# Variables d'env requises (déjà setup en Phase 3) :
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

### 3. Mobile

```bash
cd apps/mobile

# Dépendances
npm install --save \
  react-native-health@^1.19.0 \
  react-native-health-connect@^3.3.0 \
  expo-notifications@~0.29.0 \
  expo-device@~7.0.0 \
  @react-native-async-storage/async-storage@1.23.1 \
  @react-native-community/datetimepicker@8.2.0

# Merge la config Phase 4 dans app.json (voir app.config.phase4.json)
# - infoPlist iOS (NSHealthShareUsageDescription, etc.)
# - permissions Android (health.*)
# - plugins (react-native-health, react-native-health-connect, expo-notifications)

# Rebuild natif obligatoire (HealthKit/Health Connect ne marchent pas en Expo Go)
npx expo prebuild --clean
eas build --platform ios   # ou android
```

### 4. Web

Aucun build supplémentaire nécessaire. Les pages `/admin/recovery/*` se déploient avec le reste de Next.js.

### 5. Brancher le tab Recovery

Dans le `BottomTabNavigator` (Phases 1-3), ajouter :

```tsx
import { RecoveryNavigator } from './navigation/RecoveryNavigator';

<Tab.Screen
  name="Recovery"
  component={RecoveryNavigator}
  options={{
    tabBarIcon: ({ color, size }) => (
      <CDMIcon name="heart" color={color} size={size} />
    ),
  }}
/>
```

Et dans le composant racine (App.tsx), appeler `usePushRegistration()` une fois l'utilisateur connecté.

---

## 🧪 Vérifications post-déploiement

### Tests fonctionnels

1. **Sommeil manuel** : log d'une nuit → durée calculée auto + insight affiché
2. **Sync HealthKit (iOS)** : tap "Synchroniser" → import sans doublons (UNIQUE sur external_id)
3. **Hydratation quick-add** : tap "Verre 250 ml" → entry créée + streak mis à jour si target atteint
4. **Habit toggle** : tap habit aujourd'hui → log créé + checkbox cochée + streak +1
5. **Recovery Score** : doit refléter la formule 40/30/30 (sommeil/hydra/habits)
6. **Push hydratation** : configurer rappel 08:00-21:00 toutes les 2h → notification trilingue selon `profiles.language`
7. **Web admin** : `/admin/recovery` montre tous les clients avec score décroissant ; `/admin/recovery/[id]` ouvre le détail

### Tests RLS

```sql
-- En tant que client A, ne doit voir QUE ses propres sleep_sessions
SELECT count(*) FROM sleep_sessions WHERE user_id != auth.uid();
-- Doit retourner 0

-- En tant que coach, doit voir les sessions des clients ACTIFS uniquement
-- (status='active' dans coach_clients)
```

### Vérifier pg_cron

```sql
SELECT jobname, schedule, active FROM cron.job
WHERE jobname IN ('recovery-score-daily', 'recovery-streaks-reset', 'recovery-reminders-tick');
-- Les 3 doivent être active=true
```

---

## 📐 Architecture & choix techniques

### Calcul du Recovery Score

Score 0-100 calculé sur les 7 derniers jours :

| Composante | Pondération | Formule |
|---|---|---|
| Sommeil | 40 pts | `clamp(0, 40, (avg_min - 240) / 6)` — soit 8h = 40, 7h = 28, 6h = 16 |
| Hydratation | 30 pts | `(jours_target_atteint / 7) × 30` |
| Habitudes | 30 pts | `min(30, (logs_7j / 7 / habits_actives) × 30)` |

Recalculé serveur-side chaque nuit à 03:00 UTC + à la demande via `/api/recovery/recompute`.

### Sync HealthKit / Health Connect

**Idempotence** garantie par contrainte `UNIQUE (user_id, source, external_id)` :
- `external_id` iOS = hash bedtime+date
- `external_id` Android = `metadata.id` Health Connect
- Re-sync = 0 doublon

**HRV** : associée à la nuit dont la `sleep_date` matche la date du sample. Moyenne si plusieurs samples.

### Streaks

Triggers SQL sur INSERT/UPDATE des tables source :
- Sommeil : streak +1 si nuit ≥ 7h sur jour précédent (sinon reset au prochain log incomplet via pg_cron `recovery-streaks-reset` à 00:30 UTC)
- Hydratation : streak +1 le premier moment où le total du jour atteint le target
- Habits : streak +1 dès qu'au moins 1 habit est loguée dans la journée

Reset géré par `fn_reset_broken_streaks()` qui tourne à 00:30 UTC chaque jour.

### Rappels push (Edge Function)

Tick toutes les 30 min via pg_cron. L'Edge Function :
1. Charge tous les profiles avec `expo_push_token`
2. Pour chaque user, calcule l'heure locale via `Intl.DateTimeFormat` + `timezone`
3. Match les fenêtres avec une tolérance de ±15 min (= compatible avec un cron à 30 min)
4. Skippe les rappels déjà satisfaits (target hydratation atteint, nuit déjà loguée, habit déjà faite)
5. Envoie via Expo Push API (batch 100/req)

Langue choisie via `profiles.language` (fallback FR — priorité Coach DM).

### Code couleur Coach DM (respecté partout)

| Niveau | Hex | Symbole | Usage |
|---|---|---|---|
| Insight | `#10B981` | ✓ | Référence scientifique clé / conseil expert |
| Warning | `#EF4444` | ✗ | Erreur fréquente / risque blessure |
| Info | `#38BDF8` | ⓘ | Donnée chiffrée / norme |
| Tactic | `#A78BFA` | ⚑ | Application directe |
| Or principal | `#D4AF37` | — | Titres, accents, CTA |

### Sources scientifiques intégrées (insights)

Sommeil : Mah 2011, Milewski 2014, Hirshkowitz 2015 (NSF), Van Cauter 2008, Phillips 2017, Plews 2013, Drake 2013, Chang 2015
Hydratation : Casa 2000 (NATA), EFSA 2010, Hew-Butler 2015, Sawka 2007

---

## 📝 Modifications de la base existante

Cette phase **n'altère pas** les tables des Phases 1-3. Elle ajoute :
- 6 nouvelles tables (`sleep_sessions`, `hydration_targets`, `hydration_entries`, `habits`, `habit_logs`, `recovery_streaks`, `recovery_badges`)
- 1 vue (`hydration_daily`)
- 4 types ENUM (`sleep_source`, `habit_category`, `habit_frequency`, `badge_kind`)
- 7 fonctions plpgsql + 5 triggers
- 3 jobs pg_cron

Aucune colonne supprimée ni renommée. Les RLS s'appuient sur `coach_clients.status='active'` (table existante Phase 3).

---

## 🔜 Prochaine étape

Phase 5 — **Analytics & Progression**
- Dashboard progression client (graphes poids, mensurations, performance)
- Calendrier d'activité type GitHub contributions
- Records personnels (PR) automatiques
- Export PDF rapport mensuel
- Analytics agrégées multi-clients côté coach

---

**Coach DM** · Doudouh M. · Reasfit Vilvoorde · BCE BE0840.260.421
