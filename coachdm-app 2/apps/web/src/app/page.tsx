// ═══════════════════════════════════════════════════════════════
// COACH DM — Landing page (app.coachdm.be)
// 
// SEO-first, design noir/or, conversion vers signup.
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import {
  Calculator,
  Barcode,
  TrendingUp,
  Shield,
  Sparkles,
  Award,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: Calculator,
    title: 'Macros sur-mesure',
    desc: 'Calculées par formule Mifflin-St Jeor ou Katch-McArdle si tu connais ton % de masse grasse. 100% science-based.',
  },
  {
    icon: Barcode,
    title: 'Scan illimité',
    desc: 'Plus de 3 millions de produits via OpenFoodFacts. Pointe ta caméra, c\'est ajouté.',
  },
  {
    icon: TrendingUp,
    title: 'Progrès visuels',
    desc: 'Évolution du poids sur 90 jours, pesée quotidienne, photos de progression chiffrées.',
  },
  {
    icon: Shield,
    title: 'Données privées',
    desc: 'Hébergées en Europe (Supabase). Row Level Security : tes données ne sont jamais exposées.',
  },
  {
    icon: Sparkles,
    title: 'Hydratation suivie',
    desc: 'Cible quotidienne calculée selon ton poids et ton activité (norme ACSM).',
  },
  {
    icon: Award,
    title: 'Coach certifié',
    desc: '12 certifications dont CrossFit L3 CCFT, NASM CPT, Ereps Professional. Méthodes validées.',
  },
];

const benefits = [
  'Tracking nutrition complet (calories, protéines, glucides, lipides, fibres)',
  'Scanner code-barres illimité',
  'Plans adaptés à ton objectif (sèche, prise de muscle, recomp, maintien)',
  'Évolution poids et photos de progression',
  'Trilingue : français, anglais, néerlandais',
  'Annulation à tout moment, sans engagement',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg overflow-hidden">
      {/* ── Nav ───────────────────────────────────────────── */}
      <nav className="container-cdm py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center">
            <span className="text-primary font-black text-sm tracking-widest">DM</span>
          </div>
          <span className="font-black tracking-widest text-sm">COACH DM</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-muted hover:text-white text-sm font-medium transition-colors">
            Connexion
          </Link>
          <Link href="/sign-up" className="btn-primary text-sm">
            Essai gratuit
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="container-cdm pt-12 pb-20 lg:pt-20 lg:pb-32 relative">
        <div className="absolute inset-0 bg-dark-radial pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-primary text-xs font-bold tracking-widest uppercase">
              Nouveau · 7 jours gratuits
            </span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-black tracking-tightest leading-[1.05]">
            La nutrition de précision,
            <br />
            <span className="gold-text">sans deviner.</span>
          </h1>

          <p className="mt-8 text-lg lg:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            L'app Coach DM calcule tes macros au gramme près, scanne tes
            aliments en 1 seconde, et suit ton évolution.
            <br className="hidden lg:block" />
            Aucune supposition. Que de la science.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up" className="btn-primary text-lg px-8 py-4 animate-glow">
              Démarrer mon essai gratuit
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#pricing" className="btn-secondary text-lg px-8 py-4">
              Voir les tarifs
            </Link>
          </div>

          <p className="mt-6 text-xs text-muted-dim">
            Sans CB. Sans engagement. Annulation en 1 clic.
          </p>
        </div>

        {/* Mock app preview */}
        <div className="relative mt-20 max-w-3xl mx-auto">
          <div className="aspect-[4/3] rounded-3xl bg-surface border border-border-subtle p-8 lg:p-12 shadow-2xl shadow-primary/5">
            <div className="grid grid-cols-2 gap-6 h-full">
              <div className="bg-bg-elevated rounded-2xl p-6 flex flex-col items-center justify-center">
                <div className="text-6xl font-black text-primary">1247</div>
                <div className="text-xs text-muted mt-1">kcal restantes</div>
                <div className="w-full h-2 bg-border rounded-full mt-4 overflow-hidden">
                  <div className="w-2/3 h-full bg-gold-gradient rounded-full" />
                </div>
              </div>
              <div className="bg-bg-elevated rounded-2xl p-6 space-y-3">
                {[
                  { label: 'Protéines', color: 'bg-accent-protein', pct: 60 },
                  { label: 'Glucides', color: 'bg-accent-carbs', pct: 45 },
                  { label: 'Lipides', color: 'bg-accent-fat', pct: 75 },
                  { label: 'Fibres', color: 'bg-accent-fiber', pct: 30 },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>{m.label}</span>
                      <span>{m.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className={`${m.color} h-full rounded-full`}
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="container-cdm py-20 lg:py-32">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary text-sm font-bold tracking-widest uppercase mb-4">
            Ce que tu obtiens
          </p>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight">
            Tous les outils d'un coach{' '}
            <span className="gold-text">dans ta poche.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="card hover:border-primary/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-muted leading-relaxed text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────── */}
      <section
        id="pricing"
        className="container-cdm py-20 lg:py-32 border-t border-border-subtle"
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary text-sm font-bold tracking-widest uppercase mb-4">
            Tarif unique
          </p>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight">
            Simple. <span className="gold-text">Honnête.</span>
          </h2>
          <p className="mt-6 text-muted">
            Pas de tier confus. Pas d'upsell. Juste l'app complète.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="card border-2 border-primary relative overflow-hidden">
            <div className="absolute -top-px -right-px bg-primary text-bg text-xs font-black px-4 py-1.5 rounded-bl-xl tracking-widest uppercase">
              7 jours gratuits
            </div>

            <h3 className="text-2xl font-black mb-2">Coach DM Premium</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-6xl font-black gold-text">19,99 €</span>
              <span className="text-muted">/mois</span>
            </div>
            <p className="text-muted text-sm mb-6">
              TVA incluse · Sans engagement
            </p>

            <ul className="space-y-3 mb-8">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted">{b}</span>
                </li>
              ))}
            </ul>

            <Link href="/sign-up" className="btn-primary w-full text-base py-4">
              Démarrer maintenant
              <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-xs text-muted-dim text-center mt-4">
              Aucune CB demandée pour les 7 jours d'essai.
            </p>
          </div>
        </div>
      </section>

      {/* ── About coach ───────────────────────────────────── */}
      <section className="container-cdm py-20 lg:py-32 border-t border-border-subtle">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <div>
            <p className="text-primary text-sm font-bold tracking-widest uppercase mb-4">
              Le coach
            </p>
            <h2 className="text-4xl font-black mb-6 tracking-tight">
              Doudouh M.
              <br />
              <span className="gold-text">Power · Transform · Excel.</span>
            </h2>
            <p className="text-muted leading-relaxed mb-4">
              Coach certifié, je t'accompagne 100% en ligne via Coach DM. 12
              certifications professionnelles dont CrossFit L3 CCFT, NASM CPT,
              Ereps Professional.
            </p>
            <p className="text-muted leading-relaxed mb-6">
              Cette app, c'est mon coaching condensé : les mêmes méthodes
              science-based, accessibles 24/7 où que tu sois. Et si un jour tu
              veux passer au présentiel, on en parle.
            </p>
            <Link
              href="https://coachdm.be"
              target="_blank"
              className="btn-secondary"
            >
              Voir le site Coach DM
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '12', label: 'Certifications' },
              { value: '10+', label: 'Années d\'expérience' },
              { value: '21', label: 'Programmes PDF' },
              { value: '3', label: 'Langues (FR/EN/NL)' },
            ].map((s) => (
              <div
                key={s.label}
                className="card text-center border-primary/20"
              >
                <div className="text-4xl font-black gold-text">{s.value}</div>
                <div className="text-xs text-muted mt-2 tracking-wide uppercase">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="container-cdm py-20 lg:py-32 border-t border-border-subtle">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight">
            Prêt à arrêter de deviner ?
          </h2>
          <p className="mt-6 text-lg text-muted">
            Rejoins Coach DM et commence ton suivi nutrition de précision dès aujourd'hui.
          </p>
          <Link
            href="/sign-up"
            className="btn-primary text-lg px-8 py-4 mt-10 inline-flex"
          >
            Démarrer mon essai gratuit
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="container-cdm py-12 border-t border-border-subtle">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
                <span className="text-primary font-black text-xs">DM</span>
              </div>
              <span className="font-black tracking-widest text-sm">COACH DM</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Coach DM — Coaching en ligne
              <br />
              BCE BE0840.260.421
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-muted mb-3">
              Liens
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="https://coachdm.be" target="_blank" className="text-muted hover:text-white">Site Coach DM</Link></li>
              <li><Link href="https://instagram.com/coachdm.be" target="_blank" className="text-muted hover:text-white">Instagram</Link></li>
              <li><Link href="/sign-in" className="text-muted hover:text-white">Connexion</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-muted mb-3">
              Légal
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="https://coachdm.be/cgv" target="_blank" className="text-muted hover:text-white">CGV</Link></li>
              <li><Link href="https://coachdm.be/privacy" target="_blank" className="text-muted hover:text-white">Confidentialité</Link></li>
              <li><Link href="mailto:[email protected]" className="text-muted hover:text-white">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="text-center text-xs text-muted-dim border-t border-border-subtle pt-6">
          © {new Date().getFullYear()} Coach DM · Doudouh M. · Tous droits réservés.
        </div>
      </footer>
    </main>
  );
}
