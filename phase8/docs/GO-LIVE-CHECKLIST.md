# ✅ COACH DM — GO-LIVE CHECKLIST (60 POINTS)

**Objectif:** zéro point manquant le jour du launch.  
**Format:** chaque point doit être ✅ avant publication production.

---

## 1️⃣ COMPTES & PAIEMENTS (8)

- [ ] Apple Developer Program actif (99$/an payés)
- [ ] Google Play Console actif (25$ payés)
- [ ] Stripe compte vérifié en mode live (IBAN, identité, justificatif)
- [ ] Supabase Pro (25$/mois) activé pour prod
- [ ] Vercel Hobby OK ou Pro si CDN nécessaire
- [ ] Sentry Developer (gratuit) ou Team selon volume
- [ ] Anthropic API : crédits chargés, limits ok
- [ ] Nom de domaine `coachdm.be` actif, registrar accessible

## 2️⃣ DNS & DOMAINES (4)

- [ ] `app.coachdm.be` CNAME → `cname.vercel-dns.com.` propagé
- [ ] Apex `coachdm.be` GitHub Pages inchangé (4 A records)
- [ ] SSL Let's Encrypt actif sur app.coachdm.be (curl HTTP/2 200)
- [ ] `.well-known/apple-app-site-association` accessible et JSON valide

## 3️⃣ SUPABASE PROD (8)

- [ ] Projet `coachdm-prod` créé en région eu-west-3 (Paris, RGPD)
- [ ] Mot de passe DB stocké en chambre forte (>32 chars random)
- [ ] Extensions activées : pgvector, pg_cron, pg_net, uuid-ossp, pgcrypto
- [ ] 15 migrations + migration 016 Stripe appliquées sans erreur
- [ ] RLS activé sur 100% des tables sensibles (vérif `pg_policies`)
- [ ] Jobs pg_cron actifs : refresh contexte IA 03:15 UTC, plateau scan 04:30 UTC
- [ ] Backups automatiques activés (Point-in-Time Recovery si Pro)
- [ ] Edge Functions déployées : ai-chat, ai-context-builder, ai-plateau-scan, ai-recovery-reco, ai-session-suggest, stripe-webhook

## 4️⃣ STRIPE LIVE (10)

- [ ] Produit "Coach DM Premium" créé
- [ ] Prix 19.99€/mois EUR avec trial 7 jours
- [ ] Webhook actif → Edge Function stripe-webhook
- [ ] 8 events souscrits (checkout, sub created/updated/deleted/trial_will_end, invoice paid/failed/action_required)
- [ ] `STRIPE_WEBHOOK_SECRET` poussé dans Supabase secrets
- [ ] Statement descriptor : `COACHDM*PREMIUM` (max 22 chars)
- [ ] Branding : logo + couleurs noir/or
- [ ] Emails clients en FR (Settings → Branding → Email)
- [ ] Customer Portal configuré (cancel at period end, update PM, history)
- [ ] SCA / 3D Secure activé par défaut (obligatoire EU)

## 5️⃣ VERCEL DEPLOY WEB (6)

- [ ] Build prod sans erreur via Turborepo
- [ ] Toutes les env vars production poussées (Supabase, Stripe, Sentry, Anthropic, BCE, locale)
- [ ] Headers de sécurité actifs (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [ ] Alias `app.coachdm.be` lié au déploiement
- [ ] `/api/health` retourne 200
- [ ] Cron jobs Vercel actifs (cleanup-stale-trials, weekly-summary-email)

## 6️⃣ EAS BUILD MOBILE (8)

- [ ] iOS Bundle ID `be.coachdm.app` enregistré sur Apple Developer
- [ ] Android package `be.coachdm.app` réservé sur Play Console
- [ ] Distribution Certificate iOS + Provisioning Profile générés
- [ ] APNs Push Notification Key (.p8) configurée
- [ ] Android Upload Keystore sauvegardée (chambre forte)
- [ ] Google Play Service Account JSON en place
- [ ] `eas.json` profile production validé (autoIncrement true)
- [ ] Build iOS .ipa + Android .aab générés sans erreur

## 7️⃣ STORES METADATA (6)

- [ ] iOS App Store Connect : description + keywords + URLs en FR/EN/NL
- [ ] iOS Screenshots : 6.7" iPhone (5 min), 5.5" iPhone (5 min)
- [ ] iOS Privacy Manifest rempli (HealthKit, Camera, Photo Library)
- [ ] Android Play Console : full + short description + changelog FR/EN/NL
- [ ] Android Screenshots : phone (4-8) + 7" tablet (1) + 10" tablet (1)
- [ ] Android Data Safety section remplie (collected/shared data)

## 8️⃣ CONFORMITÉ LÉGALE BE/EU (8)

- [ ] BCE BE0840.260.421 visible : footer site, mentions légales, CGV
- [ ] CGV Art. VI.53 Code droit économique belge (contenu numérique non-retournable)
- [ ] Politique de confidentialité RGPD à jour : https://coachdm.be/privacy.html
- [ ] Cookie banner conforme (consent EU)
- [ ] Email DPO ou contact RGPD identifié
- [ ] Data Processing Agreement signé avec Stripe, Supabase, Anthropic
- [ ] Suppression de compte fonctionnelle (Apple Privacy + Google Play Data deletion)
- [ ] Export RGPD des données utilisateur fonctionnel (Apple App Privacy)

## 9️⃣ MONITORING & ALERTES (6)

- [ ] Sentry projet web `coachdm-web` actif (DSN poussé)
- [ ] Sentry projet mobile `coachdm-mobile` actif (DSN poussé)
- [ ] Alertes Sentry configurées (>5% error rate, regressions)
- [ ] Supabase Dashboard alerts (DB CPU > 80%, connections > 70%)
- [ ] Stripe Dashboard alerts (failed payments spike, webhook failures)
- [ ] Healthcheck cron externe (UptimeRobot ou Better Uptime) sur /api/health

## 🔟 TESTS E2E (6)

- [ ] 18 scénarios E2E exécutés (voir E2E-TESTS.md)
- [ ] 18/18 ✅ sur iOS
- [ ] 18/18 ✅ sur Android (sauf Apple Health)
- [ ] 18/18 ✅ sur web
- [ ] Test idempotency webhook validé
- [ ] Test bascule trilingue FR → EN → NL validé

---

## 🚀 GO-LIVE — ORDRE D'EXÉCUTION FINAL

1. ✅ 60 points cochés au-dessus
2. Annonce maintenance "soft" (Instagram Story)
3. Vercel : `vercel deploy --prod`
4. Stripe : passer en mode live (toggle dashboard)
5. iOS : Submit for Review → 24-48h Apple Review
6. Android : Submit to Internal Testing (24h propagation)
7. Android : Promote Internal → Production (rollout 10%)
8. Monitor Sentry + Stripe + Supabase pendant 48h
9. iOS publié auto après review → monitoring 48h
10. Android : rollout 10% → 50% → 100% sur 5 jours

---

## 📞 NUMÉROS UTILES

| Service | Contact | Quand |
|---------|---------|-------|
| Stripe Support | Dashboard chat | webhook down >30min |
| Supabase Support | support@supabase.com | DB freeze, prod down |
| Apple Developer | developer.apple.com/contact | rejet review |
| Google Play | play.google.com/console/about/contact-us | suspension app |
| Sentry | sentry.io/support | data ingestion stuck |

---

**Coach DM · Doudouh M. · BCE BE0840.260.421 · coachdm.be**
