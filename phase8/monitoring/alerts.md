# 🚨 COACH DM — RÈGLES D'ALERTES

## Sentry — Alertes web (`coachdm-web`)

### Alert 1 — Error spike
- **Quand:** `event.count() > 100` sur 1h
- **Pour:** environment = production
- **Canal:** Email Doudouh + Slack/Telegram si dispo
- **Action:** créer ticket Sev2

### Alert 2 — Regression
- **Quand:** `regression == true`
- **Pour:** issue qui était résolue ré-apparaît
- **Canal:** Email
- **Action:** investigate dans 24h

### Alert 3 — Webhook Stripe error
- **Quand:** `event.tag[function] == 'stripe-webhook' AND event.level == 'error'`
- **Pour:** Edge Function
- **Canal:** Email IMMÉDIAT
- **Action:** vérifier `stripe_events` table + replay si nécessaire

### Alert 4 — AI cost spike
- **Quand:** custom metric `ai_daily_cost_eur > 30`
- **Pour:** environment = production
- **Canal:** Email
- **Action:** investiguer top consommateurs, throttle si abus

## Sentry — Alertes mobile (`coachdm-mobile`)

### Alert 5 — Crash rate
- **Quand:** `crash_free_session_rate < 99%`
- **Pour:** release production
- **Canal:** Email
- **Action:** investigate, hotfix OTA si JS-only

### Alert 6 — ANR (Android Not Responding)
- **Quand:** `anr_count > 5` sur 24h
- **Action:** Profile via Sentry Performance

## Supabase — Alertes

Via Supabase Dashboard → Project Settings → Notifications.

### Alert 7 — DB CPU
- **Seuil:** >80% pendant 5min
- **Action:** identifier slow queries dans `pg_stat_statements`

### Alert 8 — DB connections
- **Seuil:** >70% du pool max (35/50)
- **Action:** vérifier les leaks, activer pgbouncer transaction mode

### Alert 9 — Disk usage
- **Seuil:** >80%
- **Action:** archiver vieilles données (ai_messages > 12 mois)

### Alert 10 — Egress quota
- **Seuil:** >80% du plan
- **Action:** upgrade ou réduire payload (gzip Edge functions)

### Alert 11 — Edge Function errors
- **Seuil:** error_rate > 5% sur 1h
- **Action:** logs `supabase functions logs <name> --tail`

## Stripe — Alertes

Via Stripe Dashboard → Developers → Workbench → Alerts.

### Alert 12 — Failed payments spike
- **Seuil:** failed_rate > 10% sur 1h
- **Action:** check si carte spécifique en boucle (fraud?) ou problème généralisé

### Alert 13 — Webhook delivery failures
- **Seuil:** delivery_failures > 5 sur 1h
- **Action:** check Edge Function logs, replay events depuis Dashboard

### Alert 14 — Disputes (chargebacks)
- **Seuil:** any new dispute
- **Action:** répondre <7 jours avec evidence

## Healthcheck externe

### UptimeRobot / Better Uptime — config recommandée

| Monitor | URL | Frequency | Alert |
|---------|-----|-----------|-------|
| Web home | `https://app.coachdm.be` | 5min | Down 2x consecutive |
| API health | `https://app.coachdm.be/api/health` | 5min | Down 2x |
| Site coachdm.be | `https://coachdm.be` | 15min | Down 2x |
| Supabase REST | `https://<ref>.supabase.co/rest/v1/` (attendre 401) | 5min | Down 2x |

## SLO cibles (Service Level Objectives)

| Métrique | SLO | Conséquence si dépassé |
|----------|-----|-------------------------|
| App uptime | 99.5% | Post-mortem obligatoire |
| API p95 latency | <500ms | Audit perf trimestriel |
| Mobile crash-free | >99% | Hotfix dans 7 jours |
| Webhook success | >99% | Replay manuel + investigate |
| Trial → Paid conv. | >25% | Optim onboarding |

---

**Coach DM · BCE BE0840.260.421**
