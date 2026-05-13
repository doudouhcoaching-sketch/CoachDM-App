# 🇪🇺 COACH DM — CONFORMITÉ RGPD

**Responsable du traitement:** Doudouh M.  
**SIRET / BCE:** BE0840.260.421  
**Adresse:** Reasfit Vilvoorde, Havenstraat 72b, 1800 Vilvoorde, Belgique  
**Email RGPD:** doudouh.coaching@gmail.com

---

## 1. Base légale du traitement

| Donnée | Base légale | Article RGPD |
|--------|-------------|--------------|
| Email, password, profil | Exécution du contrat | Art. 6(1)(b) |
| Données santé (poids, photos, HRV) | Consentement explicite | Art. 9(2)(a) |
| Paiements Stripe | Exécution du contrat + obligation légale | Art. 6(1)(b), (c) |
| Cookies analytics (Sentry) | Intérêt légitime + consent | Art. 6(1)(f) |
| Communication marketing | Consentement opt-in | Art. 6(1)(a) |

## 2. Données traitées

### Catégorie standard
- Email, nom, mot de passe hashé (bcrypt via Supabase Auth)
- Préférences langue (FR/EN/NL)
- Logs connexion (IP, user-agent) — conservés 90j

### Catégorie sensible (santé — Art. 9)
- Poids, taille, %BF, mensurations
- Photos de progression (4 angles)
- Données wearables (sommeil, HRV, RHR, pas)
- Charge d'entraînement (RPE, ACWR)

**Mesures spéciales pour données santé :**
- Chiffrement at-rest (Supabase Postgres encrypted volumes)
- RLS stricte : user_id = auth.uid()
- Audit log accès admin
- Aucun transfert hors EU (eu-west-3 Paris)

## 3. Sous-traitants (Data Processors)

| Sous-traitant | Rôle | DPA signé | Localisation données |
|---------------|------|-----------|---------------------|
| Supabase Inc. | Hébergement DB + Auth + Storage | ✅ DPA standard | eu-west-3 Paris (UE) |
| Stripe Payments Europe Ltd | Paiements | ✅ DPA standard | UE (Irlande) |
| Anthropic, PBC | IA Coach Assistant | ✅ DPA via Anthropic Console | USA (Standard Contractual Clauses) |
| Vercel Inc. | Hébergement web | ✅ DPA standard | UE (Frankfurt) si region cdg1 |
| Functional Software (Sentry) | Monitoring erreurs | ✅ DPA | UE option activée |
| Apple Inc. | Distribution iOS + APNs | ✅ DPA Apple Developer | USA (SCC) |
| Google LLC | Distribution Android + FCM | ✅ DPA Google Play | USA (SCC) |

**⚠ Transferts USA :** Anthropic, Apple, Google → couverts par Standard Contractual Clauses (SCC) + EU-US Data Privacy Framework si certifiés.

## 4. Durées de conservation

| Donnée | Durée | Justification |
|--------|-------|---------------|
| Compte actif | Tant que l'utilisateur est inscrit | — |
| Compte inactif 24 mois | Suppression auto | Soft-delete + email pré-suppression |
| Logs connexion | 90 jours | Sécurité |
| Données paiement (factures) | 10 ans | Obligation légale belge (Code TVA) |
| Conversations IA | 12 mois rolling | Mémoire sémantique + RGPD |
| Photos check-in | 24 mois après dernière connexion | Utile pour suivi, supprimable à tout moment |
| Backups Supabase | 7 jours (Free), 30 jours (Pro) | Sécurité |

## 5. Droits des utilisateurs

L'app expose chacun de ces droits via Settings → Confidentialité :

### a) Droit d'accès (Art. 15)
- Bouton "Exporter mes données" → génère un .zip avec toutes les rows DB où user_id = current_user
- Format : JSON + photos originales
- Délai : <30 jours (auto en quelques minutes)

### b) Droit de rectification (Art. 16)
- Tous les champs profil éditables in-app
- Email : changement via Supabase Auth (re-confirmation)

### c) Droit à l'effacement (Art. 17)
- Bouton "Supprimer mon compte"
- Action : 
  - `auth.users` → DELETE CASCADE sur toutes les tables RLS
  - Stripe : annulation subscription + customer.update avec marker `gdpr_deleted`
  - Sentry : event_id link broken (anonymisé)
  - Anthropic : conversations purgées via API
- Conservé : invoices (10 ans obligation légale belge, anonymisées si demandé)

### d) Droit à la portabilité (Art. 20)
- Export JSON standard incluant : profil, macros, recettes favorites, sessions, PRs, mesures, conversations IA
- Téléchargeable + envoyable par email

### e) Droit d'opposition (Art. 21)
- Désactivation analytics in-app (Sentry session replay opt-out)
- Désactivation marketing emails (lien dans chaque email)

### f) Droit de retrait du consentement (Art. 7)
- Granular toggles : sync wearables, partage communauté, leaderboards
- Sans impact sur le service de base

## 6. Cookies & traceurs

### Site coachdm.be (GitHub Pages)
- Aucun cookie tiers
- Pas d'analytics activé par défaut

### App app.coachdm.be (Vercel)
- Cookie de session Supabase Auth (essential, exempt consent)
- Cookies Stripe (essential pour checkout)
- Sentry session replay : opt-in only

Banner cookie : pas requis si seuls cookies essential sont posés. Si Sentry replay activé, banner consent obligatoire avant chargement.

## 7. Mineurs

- Minimum 16 ans pour créer un compte (limite RGPD Belgique)
- Si <16 ans : consentement parental obligatoire (Art. 8)
- Coach DM ne cible pas les mineurs (vérification âge à l'inscription)

## 8. Violation de données (Art. 33-34)

### Procédure en cas de breach
1. **<1h:** Confirmation incident + isolation systèmes
2. **<24h:** Évaluation impact + scope (combien d'users)
3. **<72h:** Notification APD (Autorité Protection Données belge) si risque élevé
4. **<72h:** Notification utilisateurs concernés si risque élevé
5. **<7j:** Post-mortem + plan correctif

### Contact APD
**Autorité de protection des données (Belgique)**  
Rue de la Presse, 35 — 1000 Bruxelles  
contact@apd-gba.be — +32 (0)2 274 48 00

## 9. Document à fournir si audit

- [ ] Registre des traitements (Art. 30)
- [ ] DPA signés avec chaque sous-traitant
- [ ] Analyse d'impact (DPIA) pour données santé (Art. 35)
- [ ] Politique de sécurité (chiffrement, accès, backups)
- [ ] Privacy policy à jour : https://coachdm.be/privacy.html
- [ ] CGV : https://coachdm.be/cgv.html

## 10. Notes spécifiques

### Halal-friendly implicite
Aucune donnée religieuse n'est collectée. Les recettes sans porc/alcool ne sont pas labellisées et ne révèlent aucune appartenance religieuse de l'utilisateur. Conforme Art. 9 (pas de donnée sensible révélée).

### Données santé sensibles
Pour la conformité Art. 9, le consentement explicite est recueilli au moment de l'onboarding via une page dédiée : "J'autorise Coach DM à traiter mes données de santé (poids, photos, wearables) pour me fournir un coaching personnalisé." (toggle off par défaut, requis pour utiliser les phases 1/2/4/5).

---

**Coach DM · Doudouh M. · BCE BE0840.260.421 · doudouh.coaching@gmail.com**
