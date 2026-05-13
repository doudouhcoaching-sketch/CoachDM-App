# 🌐 DNS RECORDS — app.coachdm.be

Le site marketing `coachdm.be` reste sur GitHub Pages. L'app passe sur Vercel via le sous-domaine `app.coachdm.be`.

## Records à créer chez ton registrar (Gandi / OVH / etc.)

### Pour `app.coachdm.be` → Vercel

```
Type   Hôte         Cible                       TTL
─────  ───────────  ──────────────────────────  ────
CNAME  app          cname.vercel-dns.com.       3600
```

### (Optionnel) Pour `api.coachdm.be` → Supabase Edge Functions custom domain

```
Type   Hôte         Cible                              TTL
─────  ───────────  ─────────────────────────────────  ────
CNAME  api          __PROJECT_REF__.supabase.co.       3600
```

### Conserver les records existants

```
Type   Hôte         Cible                              TTL
─────  ───────────  ─────────────────────────────────  ────
A      @            185.199.108.153                    3600    ← GitHub Pages
A      @            185.199.109.153                    3600    ← GitHub Pages
A      @            185.199.110.153                    3600    ← GitHub Pages
A      @            185.199.111.153                    3600    ← GitHub Pages
CNAME  www          coachdm.be.                        3600    ← GitHub Pages
```

### Email (si tu utilises un MX)

```
Type   Hôte         Cible                              Priorité   TTL
─────  ───────────  ─────────────────────────────────  ────────   ────
MX     @            __TON_PROVIDER_EMAIL__             10         3600
TXT    @            "v=spf1 include:_spf.google.com ~all"          3600
TXT    _dmarc       "v=DMARC1; p=quarantine; rua=mailto:..."       3600
```

## Vérification post-création

```bash
# Propagation DNS (peut prendre 5-30min)
dig app.coachdm.be CNAME +short
# Attendu : cname.vercel-dns.com.

# Certificat SSL Let's Encrypt (auto par Vercel)
curl -I https://app.coachdm.be
# Attendu : HTTP/2 200

# Test apex coachdm.be inchangé
curl -I https://coachdm.be
# Attendu : HTTP/2 200 (GitHub Pages)
```

## ⚠️ Pièges courants

1. **Ne pas créer A record pour `app`** si tu utilises CNAME — conflit DNS.
2. **TTL bas (300s) pendant migration** pour pouvoir corriger vite, puis remonter à 3600s.
3. **Apex `@` reste sur GitHub Pages** — ne pas modifier les 4 A records GitHub.
4. **SSL Vercel** se génère automatiquement via Let's Encrypt une fois le CNAME propagé. Attendre 5-10min.
5. **HSTS preload** activé par le header dans vercel.json — irreversible côté navigateur 2 ans, à ne faire qu'une fois sûr du setup.

---

**Coach DM · coachdm.be · BCE BE0840.260.421**
