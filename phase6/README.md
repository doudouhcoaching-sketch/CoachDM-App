# Coach DM · Phase 6 — Communauté

Module communautaire complet pour l'app Coach DM : feed clients, challenges, leaderboards opt-in, stories de transformation et modération coach.

---

## Contenu

### 1. Base de données (6 migrations SQL)

| Fichier | Contenu |
|---|---|
| `024_community_posts.sql` | Posts (7 kinds), commentaires, réactions (6 kinds), reports (5 raisons), auto-flag à 3+ reports, helper `fn_community_can_see_coach` |
| `025_community_challenges.sql` | Challenges + participants + entries, 9 métriques, `fn_compute_challenge_value` (défensive), `fn_recompute_challenge_*` avec ranking |
| `026_community_leaderboards.sql` | Préférences opt-in strict + entrées calculées, 6 métriques, period week/month, RLS bloquant l'insert direct |
| `027_community_stories.sql` | Stories (3 kinds), 24h par défaut, featured permanent, bucket Storage, fonction expire |
| `028_community_notifications.sql` | 8 kinds de notifs, triggers auto sur commentaires/réactions/featured/challenge, dédoublonnage 15 min |
| `029_community_cron_storage.sql` | Buckets Storage, pg_cron (4 jobs : hourly expire, nightly leaderboards/challenges, weekly top3) |

### 2. Edge Function

- `community-daily-jobs/index.ts` — orchestrateur (expire stories, refresh leaderboards, recompute challenges, push Expo)

### 3. Shared TypeScript

- `community/types.ts` — types complets (post, comment, reaction, challenge, leaderboard, story, notification)
- `community/compute.ts` — fonctions pures (progression, pacing, ranking, aggregations, insights scientifiques)
- `community/i18n.ts` — FR / EN / NL exhaustif (~110 clés)
- `community/index.ts` — re-export

### 4. Mobile Expo (8 écrans + 1 composant + 1 navigator)

- `CommunityFeedScreen` — feed principal avec compose + réactions + realtime
- `CommunityCommentsScreen` — commentaires d'un post + realtime + send bar
- `ChallengesListScreen` — tabs actif/à venir/terminé + cartes progression
- `ChallengeDetailScreen` — détail + join/leave + log custom + leaderboard interne
- `LeaderboardScreen` — opt-in + period week/month + 6 métriques + médailles top3
- `StoriesScreen` — grid 2 colonnes + viewer plein écran + before/after split
- `StoryComposeScreen` — création (photo / before_after / milestone) + upload Storage
- `CommunityNotificationsScreen` — liste + deep-link + mark-all-read
- `CommunityReportScreen` — signalement 5 raisons + détails
- `CommunityInsightCard` — composant insight (4 tons)
- `CommunityNavigator` — bottom tabs + 4 stacks

### 5. Web admin Next.js 15 (4 pages)

- `/admin/community/feed` — modération posts (filter visible/flagged/hidden, masquer/rétablir/supprimer)
- `/admin/community/challenges` — liste + création challenge trilingue
- `/admin/community/challenges/[id]` — détail + recompute + status
- `/admin/community/leaderboards` — switcher période/métrique + refresh + table top3

---

## Décisions techniques clés

- **Silo par coach** : `fn_community_can_see_coach(coach_uid, user_uid)` SECURITY DEFINER, vérifie self-coach OR coach_clients ACTIVE OR super_admin. Toutes les RLS y passent.
- **Computations cross-phases défensives** : chaque calcul vérifie `information_schema.tables` avant query → zero crash si Phase 2/4/5 absentes.
- **Modération 2-temps** : signalements (status=pending) → auto-flag à 3+ pendings → coach décide visible/hidden/removed.
- **Stories 24h** : sauf featured (témoignages permanents). Bucket Storage privé, signed URLs.
- **Leaderboards strict opt-in** : zéro user n'apparaît tant qu'il n'a pas explicitement opt-in.
- **Notifications** : triggers SQL + push asynchrone via Edge Function (batch Expo 100). Trilingue stocké en DB.
- **Cron** : hourly expire stories, 03:30 UTC challenges, 04:00 UTC leaderboards, lundi 08:00 UTC top3.

## Sources scientifiques

- Bandura 2001 — Social cognitive theory (community adherence)
- Deci & Ryan 2000 — Self-determination theory (social feedback motivation)
- Locke 2002 — Goal setting theory (time-bound goals +30% adherence)

---

## Installation

```bash
# 1. Appliquer les migrations
supabase db push

# 2. Déployer la fonction
supabase functions deploy community-daily-jobs

# 3. Ajouter les imports dans le shared package
# packages/shared/src/index.ts
export * from "./community";

# 4. Brancher le navigator dans l'app mobile
# apps/mobile/App.tsx
import { CommunityNavigator } from "./navigation/CommunityNavigator";

# 5. Brancher les pages admin
# Les pages sont déjà placées sous apps/web/app/admin/community/*
```

## Prochaines phases

- **Phase 7** — IA Coach Assistant (le `computePlateauDetection` de la Phase 5 est prêt à être branché)
- **Phase 8** — Production launch (tests E2E, monitoring, stores submission)
