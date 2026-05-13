# 📊 STRIPE DASHBOARD — KPIS À SURVEILLER

Connecte-toi à https://dashboard.stripe.com chaque semaine et note ces métriques.

## Hebdo (lundi matin)

| KPI | Source | Cible | Action si dérive |
|-----|--------|-------|------------------|
| **Trial signups** semaine | Reports → Subscriptions | Croissance MoM | Audit campagnes Insta |
| **Trial → Paid conversion** | Reports → Subscription Funnel | >25% | Améliorer onboarding J3-J7 |
| **MRR (Monthly Recurring Revenue)** | Home → MRR | Croissance | — |
| **Churn rate** | Reports → Churn | <8% | Survey cancel reasons |
| **Failed payment recovery** | Reports → Recovery | >40% | Activer Smart Retries niveau 2 |
| **Disputes count** | Disputes | 0 | Évidence dans 7j |
| **Refunds** | Refunds | <2% | Audit raisons |

## Mensuel (1er du mois)

| KPI | Cible |
|-----|-------|
| **ARR (Annual Recurring Revenue)** | MRR × 12 |
| **CAC (Customer Acquisition Cost)** | < LTV/3 |
| **LTV (Lifetime Value)** | ARPU × (1/churn) |
| **Net Revenue Retention** | >100% |
| **Subscription tenure** (mois moyens) | >12 mois objectif |

## SQL custom (depuis Supabase)

### Top 10 conversions trial → paid par mois
```sql
SELECT
  date_trunc('month', s.created_at) AS month,
  count(*) FILTER (WHERE s.status = 'trialing') AS trials,
  count(*) FILTER (WHERE s.status = 'active') AS actives,
  ROUND(100.0 * count(*) FILTER (WHERE s.status = 'active') / NULLIF(count(*), 0), 2) AS conv_rate
FROM subscriptions s
GROUP BY 1
ORDER BY 1 DESC
LIMIT 12;
```

### Cohort analysis (rétention par mois d'inscription)
```sql
WITH cohorts AS (
  SELECT
    user_id,
    date_trunc('month', created_at) AS cohort_month,
    status,
    canceled_at
  FROM subscriptions
)
SELECT
  cohort_month,
  count(*) AS cohort_size,
  count(*) FILTER (WHERE status = 'active') AS still_active,
  count(*) FILTER (WHERE canceled_at IS NOT NULL) AS canceled
FROM cohorts
GROUP BY 1
ORDER BY 1 DESC;
```

### Revenue par jour (last 30j)
```sql
SELECT
  date_trunc('day', paid_at)::date AS day,
  count(*) AS invoices_count,
  SUM(amount_paid_cents) / 100.0 AS revenue_eur
FROM invoices
WHERE paid_at > now() - interval '30 days'
  AND status = 'paid'
GROUP BY 1
ORDER BY 1 DESC;
```

## Stripe Sigma (si compte Pro)

Queries SQL custom directement dans Stripe Dashboard sur toutes les données :

```sql
-- Failed payments par raison
SELECT
  charge.failure_code,
  charge.failure_message,
  count(*) AS occurrences
FROM charges
WHERE status = 'failed'
  AND created >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY occurrences DESC;
```

---

**Coach DM · BCE BE0840.260.421**
