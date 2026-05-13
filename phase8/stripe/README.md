# 💳 STRIPE LIVE — CHECKLIST GO-LIVE

## ✅ Avant le go-live

### Compte Stripe
- [ ] Compte activé en **mode live** (pas test)
- [ ] Business profile complet : nom, BCE BE0840.260.421, adresse Reasfit Vilvoorde
- [ ] IBAN belge configuré pour les payouts
- [ ] Identité vérifiée (carte ID + selfie + justificatif domicile)
- [ ] TVA (Stripe Tax) configurée si applicable selon ton régime fiscal belge

### Branding
- [ ] Logo Coach DM uploadé (couleurs noir #0A0A0A + or #D4AF37)
- [ ] Nom public : "Coach DM" (apparaît sur relevé bancaire)
- [ ] Statement descriptor : `COACHDM*PREMIUM` (max 22 chars)
- [ ] Email de support : doudouh.coaching@gmail.com
- [ ] Site web : https://coachdm.be
- [ ] Langues emails clients : Français + English + Nederlands

### Conformité EU
- [ ] **SCA activé** (Strong Customer Authentication — obligatoire EU)
- [ ] 3D Secure activé par défaut sur tous les paiements
- [ ] Politique de confidentialité liée : https://coachdm.be/privacy.html
- [ ] CGV liées : https://coachdm.be/cgv.html
- [ ] Mention Art. VI.53 Code droit économique (contenu numérique non-retournable)
- [ ] RGPD : Data Processor Agreement signé avec Stripe

### Produit & Prix
- [ ] Produit créé : `Coach DM Premium`
- [ ] Prix : 19.99€/mois EUR
- [ ] Période d'essai : 7 jours
- [ ] Métadonnées : `brand=Coach DM`, `locale=fr,en,nl`, `bce=BE0840.260.421`

### Webhook
- [ ] Endpoint créé : `https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhook`
- [ ] Events activés (8 minimum) :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `invoice.payment_action_required`
- [ ] Webhook secret poussé dans Supabase secrets (`STRIPE_WEBHOOK_SECRET`)
- [ ] Test signing avec `stripe trigger checkout.session.completed`

### Customer Portal
- [ ] Configuration activée
- [ ] Annulation autorisée à la fin de période (pas immédiate)
- [ ] Update payment method autorisé
- [ ] Historique factures visible
- [ ] Default return URL : `https://app.coachdm.be/account`

## 🧪 Tests obligatoires avant launch

### Cartes de test Stripe (en mode test puis bascule live)
| Carte | Numéro | Cas |
|-------|--------|-----|
| Visa success | 4242 4242 4242 4242 | Paiement OK |
| Visa SCA challenge | 4000 0027 6000 3184 | 3DS obligatoire |
| Carte refusée | 4000 0000 0000 9995 | Décline générique |
| Carte expirée | 4000 0000 0000 0069 | Expired |
| Trial conversion | (séquence trial → paid) | Conversion auto J+7 |

### Scénarios E2E
- [ ] Signup → checkout → trial activé → user_profiles.tier = 'premium'
- [ ] J+5 trial → notification trial_will_end créée
- [ ] J+7 trial → first invoice paid → subscription active
- [ ] Customer Portal → cancel at period end → tier reste 'premium' jusqu'à fin période
- [ ] Fin période après cancel → tier passe à 'free'
- [ ] Carte refusée → invoice.payment_failed → notification client
- [ ] Re-test idempotency : déclencher 2x le même event → 1 seule insertion

## 📊 KPIs à surveiller post-launch (Stripe Dashboard)

| KPI | Cible | Action si dérive |
|-----|-------|------------------|
| Trial → Paid conversion | >25% | Améliorer onboarding |
| Churn mensuel | <8% | Survey cancel reasons |
| Failed payment recovery | >40% | Activer Smart Retries |
| Time to first payment | <15min après checkout | Vérifier webhook latency |
| MRR (Monthly Recurring Revenue) | Croissance MoM | Dashboard hebdomadaire |

## 🛠 CLI utiles

```bash
# Lister les abonnements actifs
stripe subscriptions list --limit 100 --status active --api-key $STRIPE_SECRET_KEY_LIVE

# Vérifier webhook health
stripe webhook_endpoints retrieve $STRIPE_WEBHOOK_ID --api-key $STRIPE_SECRET_KEY_LIVE

# Replay un event en cas de problème
stripe events resend evt_xxx --api-key $STRIPE_SECRET_KEY_LIVE

# Logs webhook
stripe logs tail --api-key $STRIPE_SECRET_KEY_LIVE
```

## 🚨 Incidents typiques

### Webhook timeouts
**Symptôme :** Stripe retente l'event 5x sur 3 jours puis abandonne.
**Fix :** Webhook doit répondre 200 en <30s. Si traitement long, queue async + return 200 immédiat.

### Idempotency cassée
**Symptôme :** Même event traité 2x (double subscription, etc).
**Fix :** Vérifier que `stripe_events.event_id` est bien PRIMARY KEY et que l'insert est fait AVANT le commit de la transaction métier. Notre handler le fait correctement.

### Signature mismatch
**Symptôme :** Tous les webhooks retournent 400.
**Fix :** Vérifier `STRIPE_WEBHOOK_SECRET` dans Supabase secrets correspond exactement au `whsec_...` du dashboard. Le secret est différent en mode test vs live.

### SCA refus en chaîne
**Symptôme :** Beaucoup de `invoice.payment_action_required` sans conversion.
**Fix :** L'utilisateur doit valider 3DS sur sa banque. Envoyer email + push notif avec deeplink vers `coachdm://account/billing`.

---

**Coach DM · BCE BE0840.260.421 · coachdm.be**
