# 🚨 COACH DM — INCIDENT RUNBOOK

**Objectif:** réagir vite et juste face aux incidents production.  
**Principe:** stopper le saignement → diagnostiquer → fixer → post-mortem.

---

## 🟥 SEVERITY 1 — App down complète

### Symptômes
- `https://app.coachdm.be` retourne 500/503 pendant >5min
- Supabase Health Check rouge
- Sentry événement spike (>50 errors/min)

### Réaction immédiate (5min max)
```bash
# 1. Identifier ce qui est en panne
curl -I https://app.coachdm.be/api/health
# Si 500 → Vercel ou Supabase
# Si timeout → DNS ou Vercel
# Si 503 Cloudflare → upstream Vercel

# 2. Vérifier statuts upstream
open https://www.vercel-status.com
open https://status.supabase.com
open https://status.stripe.com
```

### Si Vercel build cassé
```bash
cd phase8
bash scripts/99-rollback.sh vercel
# Sélectionner le dernier déploiement stable
```

### Si Supabase DB freeze
1. Dashboard Supabase → SQL Editor
2. Lister connexions actives :
```sql
SELECT pid, usename, application_name, state, query_start, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```
3. Kill les queries longues (>5min) :
```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE state != 'idle' AND query_start < now() - interval '5 minutes';
```
4. Si toujours bloqué → contact Supabase support

### Communication
- Instagram Story : "Maintenance en cours, retour rapide 🛠"
- Banner in-app si possible (cron Vercel push)

---

## 🟧 SEVERITY 2 — Paiements bloqués

### Symptômes
- Stripe webhook 4xx/5xx >10% sur 15min
- `stripe_events` n'enregistre plus de nouvelles rows
- Users signalent "carte refusée" anormalement

### Diagnostic
```bash
# Logs Edge Function Stripe webhook
supabase functions logs stripe-webhook --project-ref $PROJECT_REF --tail

# Liste webhook deliveries Stripe
stripe webhook_endpoints retrieve $STRIPE_WEBHOOK_ID --api-key $STRIPE_SECRET_KEY_LIVE
```

### Causes communes
| Symptôme | Cause | Fix |
|----------|-------|-----|
| Signature mismatch | `STRIPE_WEBHOOK_SECRET` désync | Re-push secret depuis dashboard |
| Timeout 30s | Edge function trop lente | Vérif DB queries non-indexées |
| 500 sur insert | `stripe_events.event_id` conflict | Vérif idempotency handler |
| 401 | JWT verify activé par erreur | `supabase functions deploy stripe-webhook --no-verify-jwt` |

### Replay events manqués
1. Stripe Dashboard → Webhooks → Voir failed deliveries
2. Cliquer "Resend" sur chaque event manqué
3. Vérifier que `stripe_events` reçoit la row

### Si totalement HS
```bash
bash scripts/99-rollback.sh stripe
# Désactive webhook côté Stripe — paiements continuent mais subscriptions DB ne reflètent plus
# À rétablir AU PLUS VITE pour ne pas perdre la trace
```

---

## 🟨 SEVERITY 3 — Edge Function IA en surcoût

### Symptômes
- `ai_usage_daily.cost_eur` > 50€/jour soudainement
- Anthropic API rate-limit atteint
- Latency moyenne `ai_messages.latency_ms` >15s

### Diagnostic
```sql
-- Top 10 conversations consommant le plus
SELECT
  c.user_id,
  c.id AS conversation_id,
  count(m.id) AS message_count,
  sum(m.input_tokens) AS in_tok,
  sum(m.output_tokens) AS out_tok,
  sum(m.cost_eur) AS total_eur
FROM ai_conversations c
JOIN ai_messages m ON m.conversation_id = c.id
WHERE m.created_at > now() - interval '24 hours'
GROUP BY 1, 2
ORDER BY total_eur DESC
LIMIT 10;
```

### Fix court terme
- Réduire `MAX_TURNS` dans `ai-chat/index.ts` de 6 → 4
- Activer rate-limit per-user dans Edge Function (10 req/h max)

### Fix long terme
- Cache embeddings pour requêtes répétitives
- Tier free : 5 messages/jour seulement (premium = illimité)

---

## 🟩 SEVERITY 4 — Apple Review rejet

### Causes communes
| Rejet | Fix |
|-------|-----|
| Guideline 5.1.1 (privacy) | Vérifier que HealthKit / Camera / Photo permissions ont des descriptions claires |
| Guideline 3.1.1 (in-app purchases) | Stripe pour abonnement SaaS web-based : OK. Si rejet, lier la doc Stripe Reader |
| Guideline 2.1 (crashes) | Sentry → reproduire crash + fix |
| Guideline 4.0 (design) | Vérifier qu'on n'a pas copié l'UI d'une autre app |
| Metadata rejection (FR description) | Reformuler description sans superlatifs marketing |

### Response template
```
Hello App Review Team,

Thank you for your feedback regarding [issue].

We have addressed this by [fix]. Specifically:
1. [...]
2. [...]

The updated build is now ready for review. Please let us know if you need any additional information.

Best regards,
Doudouh M.
Coach DM — BCE BE0840.260.421
```

---

## 🟦 SEVERITY 5 — Google Play suspension

### Causes typiques
- Permissions trop larges (ex: ACCESS_FINE_LOCATION sans usage justifié)
- Données santé non déclarées dans Data Safety
- Politique de confidentialité non accessible
- Use of Background Location sans justification

### Notre setup défensif
- `blockedPermissions` configurés dans `app.config.production.ts` :
  - READ_PHONE_STATE
  - ACCESS_FINE_LOCATION
  - ACCESS_COARSE_LOCATION
- Data Safety section à remplir : ✅ Health & fitness data, ❌ Location
- Privacy URL accessible : https://coachdm.be/privacy.html

---

## 📊 Post-mortem template

Pour tout incident SEV1/SEV2, rédiger dans les 48h :

```markdown
# Post-mortem — [Date] — [Titre]

## TL;DR
[1 phrase]

## Impact
- Durée : [HH:MM → HH:MM] ([Xh])
- Users affectés : [estimation]
- Revenue impact : [€ perdus]

## Timeline (UTC)
- HH:MM — Détection (alerte X)
- HH:MM — Diagnostic
- HH:MM — Mitigation
- HH:MM — Résolution

## Root cause
[Explication technique]

## Que faire pour que ça ne se reproduise pas
- [ ] [Action 1] — owner: __, deadline: __
- [ ] [Action 2] — owner: __, deadline: __

## Ce qui a bien marché
- [...]

## Ce qui n'a pas marché
- [...]
```

Sauvegarder dans `docs/post-mortems/YYYY-MM-DD-titre.md`.

---

**Coach DM · BCE BE0840.260.421**
