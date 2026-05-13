# 🚀 COACH DM — PHASE 8 PRODUCTION LAUNCH PACK

**Version:** 1.0  
**Date:** 2026-05-11  
**Cible:** app.coachdm.be (web Next.js 15) + iOS/Android (Expo SDK 52)  
**Stack:** Supabase eu-west-3 · Stripe live · Vercel · EAS Build · Sentry

---

## 📋 ORDRE D'EXÉCUTION OBLIGATOIRE

Ne pas sauter d'étape. Chaque étape valide la suivante.

| # | Étape | Durée | Bloquant si échec |
|---|-------|-------|-------------------|
| 1 | Comptes & paiements (Apple, Google, Stripe, Supabase, Vercel) | 1-3j | ✅ Tout |
| 2 | Supabase prod provisioning + migrations 001→015 | 2h | Backend |
| 3 | Stripe live setup (produit, prix, webhook, secret) | 1h | Paiements |
| 4 | Vercel deploy web (app.coachdm.be) + DNS + SSL | 1h | Web |
| 5 | Sentry projets web + mobile (DSN x2) | 30min | Monitoring |
| 6 | EAS Build iOS .ipa + Android .aab | 2h | Mobile |
| 7 | App Store Connect + Google Play Console upload | 2h | Distribution |
| 8 | Tests E2E manuels (signup→trial→paid→IA→checkin) | 3h | Go-live |
| 9 | Go-live final + monitoring 48h | 48h | — |

**Durée totale estimée:** 5-7 jours (dont attente review Apple ~24-48h, Google ~3-7j)

---

## 📂 CONTENU DU PACK

```
phase8/
├── README.md                          ← Ce fichier
├── scripts/
│   ├── 00-preflight.sh                ← Vérifie env locale
│   ├── 01-supabase-provision.sh       ← Provisioning Supabase prod
│   ├── 02-migrations-run.sh           ← Exécute les 15 migrations
│   ├── 03-stripe-setup.sh             ← Crée produit + prix + webhook
│   ├── 04-vercel-deploy.sh            ← Deploy web
│   ├── 05-eas-build.sh                ← Build iOS + Android
│   └── 99-rollback.sh                 ← Rollback urgence
├── supabase/
│   ├── config.toml                    ← Config locale CLI
│   ├── secrets.example.env            ← Template secrets prod
│   └── seed-prod.sql                  ← Seed minimal prod
├── stripe/
│   ├── webhook-handler.ts             ← Edge Function Stripe webhook
│   ├── products.json                  ← Définition produit Premium
│   └── README.md                      ← Stripe go-live checklist
├── vercel/
│   ├── vercel.json                    ← Config build + headers + redirects
│   ├── .env.production.example        ← Template env vars
│   └── dns-records.md                 ← Records DNS à créer
├── eas/
│   ├── eas.json                       ← Build profiles dev/preview/production
│   ├── app.config.production.ts       ← App config prod (bundle id, version)
│   └── credentials.md                 ← Gestion certs iOS + keystore Android
├── fastlane/
│   ├── ios/
│   │   ├── Fastfile                   ← Lane submit_testflight + release
│   │   └── metadata/                  ← Description trilingue FR/EN/NL
│   └── android/
│       ├── Fastfile                   ← Lane internal + production
│       └── metadata/                  ← Listing trilingue FR/EN/NL
├── sentry/
│   ├── sentry.client.config.ts        ← Sentry Next.js client
│   ├── sentry.server.config.ts        ← Sentry Next.js server
│   ├── sentry.edge.config.ts          ← Sentry Edge Runtime
│   └── sentry-expo.ts                 ← Sentry mobile Expo
├── monitoring/
│   ├── healthcheck.sh                 ← Healthcheck endpoints
│   ├── alerts.md                      ← Règles d'alertes Sentry + Supabase
│   └── dashboard-stripe.md            ← Métriques Stripe à surveiller
└── docs/
    ├── E2E-TESTS.md                   ← 18 scénarios de test manuels
    ├── GO-LIVE-CHECKLIST.md           ← Checklist finale 60 points
    ├── INCIDENT-RUNBOOK.md            ← Procédures incident
    └── RGPD-COMPLIANCE.md             ← Conformité données EU
```

---

## ⚡ DÉMARRAGE RAPIDE

```bash
# 1. Cloner le pack dans ton monorepo
cp -r phase8/ /path/to/coachdm-app/deploy/

# 2. Préflight
cd deploy/phase8
bash scripts/00-preflight.sh

# 3. Suivre l'ordre du runbook
cat README.md  # Cette doc
cat docs/GO-LIVE-CHECKLIST.md  # Checklist 60 points
```

---

## 🔒 STANDARDS COACH DM RESPECTÉS

- Trilingue FR/EN/NL sur store listings, emails Stripe, écrans erreur
- Palette #0A0A0A / #D4AF37 sur splash screens, icônes, écrans système
- RGPD EU-west-3 (Supabase Paris), pas de transfert hors UE pour données perso
- BCE BE0840.260.421 visible footer + mentions légales + CGV
- CGV Art. VI.53 Code droit économique belge (contenu numérique non-retournable)
- Halal implicite (zéro mention alcool/porc dans copy stores)
- Tutoiement direct, jamais mélodramatique

---

## 🆘 INCIDENT

En cas de souci pendant go-live :
1. `bash scripts/99-rollback.sh` — rollback dernière version stable
2. Lire `docs/INCIDENT-RUNBOOK.md`
3. Désactiver les builds dans EAS dashboard
4. Couper le webhook Stripe via dashboard si nécessaire

---

**COACH DM · Doudouh M. · BCE BE0840.260.421 · coachdm.be**
