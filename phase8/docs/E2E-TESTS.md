# 🧪 COACH DM — TESTS E2E MANUELS

**Durée totale:** ~3h sur 1 device iOS + 1 Android + 1 web  
**À faire avant chaque release production**  
**Format:** chaque test = setup → actions → résultats attendus → ✅/❌

---

## 🔐 AUTHENTIFICATION

### Test 1 — Signup nouveau compte FR
**Setup:** app fresh install, langue FR  
**Actions:**
1. Ouvrir l'app → écran d'accueil en FR
2. Tap "Créer un compte"
3. Email valide + password 12 chars + confirm
4. Tap "S'inscrire"

**Attendu:**
- Email de confirmation envoyé via Supabase Auth
- Redirection vers onboarding (profil)
- Aucune erreur Sentry
- `user_profiles` row créée avec `tier='free'`

✅/❌ : ___________

---

### Test 2 — Login multi-device
**Actions:**
1. Login sur iOS
2. Login même compte sur Android
3. Login sur web (app.coachdm.be)

**Attendu:**
- Sessions actives sur 3 devices simultanément
- SecureStore mobile conserve tokens chunked
- Logout d'un device n'invalide pas les autres

✅/❌ : ___________

---

### Test 3 — Reset password
**Actions:**
1. Tap "Mot de passe oublié"
2. Saisir email
3. Réceptionner email Supabase
4. Cliquer lien → définir nouveau password

**Attendu:**
- Email reçu en <2min
- Lien fonctionne sur mobile (deeplink coachdm://reset)
- Anciens tokens invalidés

✅/❌ : ___________

---

## 💳 ABONNEMENT STRIPE

### Test 4 — Trial signup avec carte de test
**Setup:** mode test Stripe (`pk_test_...`)  
**Actions:**
1. Onboarding terminé → écran paywall
2. Tap "Commencer mon essai gratuit 7j"
3. Stripe Checkout → carte `4242 4242 4242 4242`
4. Confirmer

**Attendu:**
- `checkout.session.completed` reçu par webhook
- Row dans `subscriptions` avec `status='trialing'`, `trial_end=J+7`
- `user_profiles.tier` passe à `premium`
- Email Stripe "Trial commencé" reçu (FR)
- App débloque toutes les features

✅/❌ : ___________

---

### Test 5 — SCA challenge (3DS)
**Actions:**
1. Checkout avec carte `4000 0027 6000 3184`
2. Stripe demande 3DS

**Attendu:**
- Modal 3DS s'affiche
- Validation OK → trial activé
- Refus → message clair en FR

✅/❌ : ___________

---

### Test 6 — Notification trial_will_end J+5
**Setup:** trial en cours, attendre J+5 ou trigger manuel  
**Actions:**
```bash
stripe trigger customer.subscription.trial_will_end
```

**Attendu:**
- Row dans `notifications` (titre + body trilingue)
- Push notif reçue sur mobile
- In-app : badge sur tab Account

✅/❌ : ___________

---

### Test 7 — Conversion trial → paid à J+7
**Actions:** laisser le trial expirer ou trigger
```bash
stripe trigger invoice.paid
```

**Attendu:**
- `subscriptions.status` passe à `active`
- Row dans `invoices` (19.99€)
- Email facture reçu (FR)
- Tier reste `premium`

✅/❌ : ___________

---

### Test 8 — Cancel at period end
**Actions:**
1. Account → "Gérer l'abonnement"
2. Customer Portal s'ouvre
3. Tap "Annuler" → "À la fin de la période"

**Attendu:**
- `subscriptions.cancel_at_period_end=true`
- Tier reste `premium` jusqu'à fin période
- Email confirmation annulation (FR)

✅/❌ : ___________

---

### Test 9 — Payment failed retry
**Actions:** trigger
```bash
stripe trigger invoice.payment_failed
```

**Attendu:**
- Notification trilingue créée (`type='payment_failed'`)
- Push reçue avec deeplink `coachdm://account/billing`
- Stripe Smart Retries activé en arrière-plan

✅/❌ : ___________

---

### Test 10 — Idempotency webhook
**Actions:**
1. Stripe Dashboard → Events → choisir un event passé
2. "Resend"
3. Re-resend une seconde fois

**Attendu:**
- Premier reçu → traité (insertion `stripe_events`)
- Second reçu → response 200 avec `duplicate: true`
- Aucune double insertion en DB

✅/❌ : ___________

---

## 🥗 PHASE 1 — NUTRITION

### Test 11 — Calcul macros profil
**Actions:**
1. Profil → renseigner âge 30, sexe H, poids 80kg, taille 180, BF 15%, objectif maintien
2. Save

**Attendu:**
- BMR Katch-McArdle calculé (car BF% renseigné)
- TDEE = BMR × activity factor
- Macros split affichés
- Cohérent avec calcul manuel

✅/❌ : ___________

---

### Test 12 — Scan code-barres OpenFoodFacts
**Actions:**
1. Nutrition → Add food → Scan
2. Scanner un code-barres réel (ex: bouteille d'eau)

**Attendu:**
- API OpenFoodFacts répond en <3s
- Produit affiché avec macros
- Ajout au repas OK

✅/❌ : ___________

---

## 💪 PHASE 2 — WORKOUTS

### Test 13 — Session player + PR detection
**Actions:**
1. Programme Fat Burner 10W → Week 1 → Session 1
2. Lancer session → log sets (poids + reps)
3. Battre le record précédent

**Attendu:**
- Rest timer démarre auto après set
- e1RM Epley calculé
- Alerte PR animation + son
- Row dans `personal_records`

✅/❌ : ___________

---

## 🧘 PHASE 4 — MOBILITÉ & WEARABLES

### Test 14 — Apple Health sync (iOS uniquement)
**Actions:**
1. Settings → Connect Apple Health
2. Autoriser sleep, HRV, RHR, steps
3. Pull-to-refresh sur dashboard

**Attendu:**
- Dernières 24h synchronisées
- `recovery_daily` row créée/updatée
- Score 0-100 calculé

✅/❌ : ___________

---

## 🤖 PHASE 7 — IA COACH

### Test 15 — Chat IA tool-use
**Actions:**
1. AI Coach tab → New conversation
2. "Comment se déroule ma semaine ?"

**Attendu:**
- Indicateur "thinking" affiché
- Tool `get_client_context` invoqué (indicateur coloré)
- Réponse cohérente avec données réelles
- Latency <8s
- Tokens loggés dans `ai_messages` + `ai_usage_daily`
- Coût EUR calculé

✅/❌ : ___________

---

### Test 16 — Safety net adjustment
**Setup:** simuler ACWR > 1.3  
**Actions:** demander à l'IA d'augmenter le volume

**Attendu:**
- `validateAdjustment` refuse (warning `acwr_too_high`)
- IA propose deload à la place
- Pas d'`ai_plan_adjustments` créé en mode "intensify"

✅/❌ : ___________

---

## 👥 PHASE 6 — COMMUNAUTÉ

### Test 17 — Post + reaction + report
**Actions:**
1. Feed → New post avec texte + image
2. Autre compte → reagir 🔥
3. Autre compte → report post

**Attendu:**
- Post visible avec compteur réactions
- Push notif au poster pour réaction
- Report visible dans admin `/admin/community/reports`
- Silo coach respecté (post invisible aux autres coachs)

✅/❌ : ___________

---

## 🌍 TRILINGUE & RGPD

### Test 18 — Bascule de langue FR → NL
**Actions:**
1. Settings → Language → Nederlands
2. Naviguer dans toutes les sections

**Attendu:**
- Toute l'UI bascule en NL (y compris emails Stripe si pris en compte)
- Pas de string FR résiduelle
- Tips science codifiés (✓✗ⓘ⚑) avec textes NL
- Disclaimer médical en NL

✅/❌ : ___________

---

## 📝 Récap

| # | Test | iOS | Android | Web | Notes |
|---|------|-----|---------|-----|-------|
| 1 | Signup FR | | | | |
| 2 | Login multi-device | | | | |
| 3 | Reset password | | | | |
| 4 | Trial signup | | | | |
| 5 | SCA 3DS | | | | |
| 6 | Trial ending notif | | | | |
| 7 | Trial → paid | | | | |
| 8 | Cancel at period end | | | | |
| 9 | Payment failed | | | | |
| 10 | Idempotency | | | | |
| 11 | Calcul macros | | | | |
| 12 | Scan barcode | | | | |
| 13 | Session + PR | | | | |
| 14 | Apple Health | | n/a | n/a | |
| 15 | Chat IA | | | | |
| 16 | Safety net IA | | | | |
| 17 | Post + report | | | | |
| 18 | Bascule NL | | | | |

**Critère go-live :** 18/18 ✅ sur les 3 plateformes (sauf Test 14 iOS only).

---

**Coach DM · BCE BE0840.260.421**
