# Coach DM · Phase 5 — Analytics & Progression

**Date :** 10 mai 2026
**Statut :** Livré
**Périmètre :** Dashboard progression complète client + vue coach

---

## Ce qui est livré

### Côté client (mobile)
- **Dashboard progression** : KPIs poids/PRs, mini-graphe, heatmap, alerte plateau
- **Graphe poids** : 30j / 3m / 1an / Tout, stats min/max/moy/Δ
- **Graphes mensurations** : 10 mesures (cou, poitrine, taille, hanches, biceps G/D, cuisses G/D, mollets G/D)
- **Graphe performance** : évolution 1RM par exercice (sélection multi-exercices)
- **Calendrier d'activité GitHub-style** : 365 jours, intensité 0-4, streak, détail jour
- **Liste PRs** : groupés force/cardio/composition, delta vs précédent
- **Photos avant/après** : slider tactile (gesture handler) + timeline grille, upload natif
- **Rapport mensuel PDF** : généré on-device, partage natif iOS/Android

### Côté coach (web admin)
- `/admin/progression` : liste clients triée par activité 30j (vert/or/rouge)
- `/admin/progression/[clientId]` : vue détaillée (graphes Recharts, heatmap, PRs, plateau)
- Bouton "Recalculer les PRs" → Edge Function

### Backend
- 4 migrations SQL + 1 défensive (020b)
- 1 Edge Function (`progression-recompute`)
- 1 API route Next.js (`/api/progression/recompute`)

---

## Structure des fichiers

```
coachdm-phase5/
├── supabase/
│   ├── migrations/
│   │   ├── 020_progression_metrics.sql      # body_metrics + vue hebdo
│   │   ├── 020b_workout_logs_duration.sql   # defensive backfill
│   │   ├── 021_personal_records.sql         # PRs auto + triggers + RPC
│   │   ├── 022_activity_calendar.sql        # cardio_logs + vue daily_activity
│   │   └── 023_progress_photos.sql          # photos + comparisons + storage
│   └── functions/
│       └── progression-recompute/
│           └── index.ts                     # Edge Function de recalcul
├── packages/shared/src/progression/
│   ├── types.ts          # Tous les types TS
│   ├── calc1RM.ts        # Epley + Brzycki + best
│   ├── plateau.ts        # Détection plateau trilingue
│   ├── formatters.ts     # kg/cm/%/pace/duration/distance
│   ├── i18n.ts           # 60+ clés FR/EN/NL
│   └── index.ts          # Exports + couleurs Coach DM
├── apps/mobile/src/
│   ├── components/progression/
│   │   ├── InsightCard.tsx       # Code couleur ✓/✗/ⓘ/⚑
│   │   ├── LineChart.tsx         # Skia natif
│   │   ├── ActivityHeatmap.tsx   # GitHub-style + streak
│   │   └── BeforeAfterSlider.tsx # Gesture handler
│   ├── screens/progression/      # 8 écrans
│   └── lib/ProgressionNavigator.tsx
└── apps/web/src/app/
    ├── admin/progression/
    │   ├── page.tsx                     # Liste clients
    │   └── [clientId]/
    │       ├── page.tsx                 # Server component
    │       └── ClientProgressionView.tsx # Recharts client
    └── api/progression/recompute/route.ts
```

**Total :** 28 fichiers · ~6 200 lignes

---

## Installation

### 1. Migrations SQL
```bash
cd supabase
supabase db push
# ou si tu utilises la migration manuelle :
psql $DATABASE_URL -f migrations/020_progression_metrics.sql
psql $DATABASE_URL -f migrations/020b_workout_logs_duration.sql
psql $DATABASE_URL -f migrations/021_personal_records.sql
psql $DATABASE_URL -f migrations/022_activity_calendar.sql
psql $DATABASE_URL -f migrations/023_progress_photos.sql
```

### 2. Edge Function
```bash
supabase functions deploy progression-recompute
```

### 3. Dépendances mobile
Voir `PACKAGE_DEPS.json`. À ajouter dans `apps/mobile/package.json` :
```json
{
  "@shopify/react-native-skia": "^1.5.0",
  "react-native-gesture-handler": "~2.20.2",
  "react-native-reanimated": "~3.16.1",
  "expo-image-picker": "~16.0.4",
  "expo-file-system": "~18.0.6",
  "base64-arraybuffer": "^1.0.2",
  "react-native-html-to-pdf": "^0.12.0",
  "react-native-share": "^11.0.3",
  "@react-navigation/native-stack": "^7.1.14"
}
```

> ⚠️ `react-native-html-to-pdf` et `react-native-share` nécessitent un dev client (`expo prebuild`). Si tu restes sur Expo Go, remplace par `expo-print` + `expo-sharing` dans `MonthlyReportScreen.tsx` (deps alternatives listées dans `PACKAGE_DEPS.json`).

### 4. Dépendances web
```bash
cd apps/web
npm install recharts
```

### 5. Branchement du navigator mobile
Dans `apps/mobile/App.tsx` (root navigator), ajouter un onglet ou stack vers `<ProgressionNavigator locale={userLocale} />`.

---

## Sources scientifiques intégrées

| Référence | Usage |
|---|---|
| Epley 1985 | Estimation 1RM (formule classique pour reps > 10) |
| Brzycki 1993 | Estimation 1RM (formule pour reps ≤ 10) |
| Mayhew 1992 | Choix Brzycki vs Epley selon nombre de reps |
| Helms 2014 | Détection plateau (3+ semaines de stagnation) |
| Lockie 2017 | Fréquence de monitoring anthropométrique |

---

## Calculs clés

### Recovery Score (rappel Phase 4, intégré côté coach)
- Sommeil 40 + Hydra 30 + Habits 30 = 100 max

### 1RM Estimation
```typescript
// Brzycki si reps ≤ 10
1RM = load × 36 / (37 - reps)

// Epley si reps > 10
1RM = load × (1 + reps / 30)
```

### Daily Activity Intensity (0-4)
- 0 — Rien
- 1 — 1 habitude OU ≥1L hydratation
- 2 — 1 workout OU cardio < 45min
- 3 — workout ≥45min OU cardio ≥45min OU les deux
- 4 — workout + cardio + recovery (habits ≥ 1 + hydra ≥ 2L)

### Plateau Detection
- Compare moyenne 3 semaines récentes vs 3 semaines baseline
- Seuil par défaut : 0.3 kg ou 0.5% du poids
- Recommandation contextualisée selon objectif (cut/bulk/maintain)

---

## Contraintes Coach DM respectées

- ✅ Code couleur partout (or #D4AF37 / vert #10B981 / rouge #EF4444 / bleu #38BDF8 / violet #A78BFA)
- ✅ Fond noir #0A0A0A sur tous les écrans
- ✅ Trilingue FR (priorité) / EN / NL sur 60+ clés i18n
- ✅ Sources scientifiques visibles dans les insights (Helms 2014, Epley 1985…)
- ✅ Pas de porc, pas d'alcool, contenu universellement compatible
- ✅ RLS strict (client voit ses données, coach voit ses clients actifs uniquement)
- ✅ Photos privées par défaut + opt-in coach (visible_to_coach)
- ✅ Anti-doublon syncs externes via UNIQUE(user_id, source, external_id)

---

## Tests à faire en QA

1. **Insert workout_sets** → vérifier qu'un PR strength_1rm + strength_volume apparaît dans `personal_records`
2. **Insert body_metrics avec weight_kg=70** → vérifier body_weight_min et body_weight_max créés
3. **Insert cardio_log run 5km/25min** → vérifier cardio_distance + duration + pace
4. **Recompute Edge Function** : POST `/api/progression/recompute` avec un user_id, vérifier que la table `personal_records` est wipée et reconstruite
5. **Slider photo** : 2 photos même pose, tap+drag, vérifier que la position change
6. **Plateau detection** : insérer 6 semaines de poids ±0.1kg, vérifier l'insight rouge
7. **RLS coach** : vérifier qu'un coach voit uniquement les clients liés via `coach_clients status='active'`
8. **PDF export** : générer un rapport, vérifier l'ouverture native + le branding doré

---

## Anticipation Phase 7 (IA Coach Assistant)

La fonction `computePlateauDetection` est déjà branchée et fournit le hook idéal pour Phase 7 :
- L'IA pourra écouter les plateaux détectés et proposer des ajustements automatiques (refeed, deload, mésocycle de force)
- Les PRs servent de baseline objective pour détecter une régression
- Le calendrier d'activité fournit le contexte d'adhérence pour calibrer les recommandations

---

**Coach DM** · Doudouh M. · Reasfit Vilvoorde · BCE BE0840.260.421
