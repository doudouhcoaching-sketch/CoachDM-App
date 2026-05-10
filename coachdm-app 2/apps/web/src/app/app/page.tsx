// ═══════════════════════════════════════════════════════════════
// COACH DM — /app (dashboard web)
// 
// Le tracking quotidien se fait surtout sur mobile, le web montre :
// - L'état de l'abonnement
// - Un résumé du jour
// - Liens téléchargement app
// - CTA abonnement si pas encore actif
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Smartphone, Apple, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { startCheckoutAction, openPortalAction } from '@/lib/actions';
import type { DailyDashboard } from '@coachdm/shared';

export default async function AppDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const sp = await searchParams;

  const [profileRes, subRes, dashboardRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.rpc('get_daily_dashboard', { p_date: new Date().toISOString().slice(0, 10) }),
  ]);

  const profile = profileRes.data;
  const subscription = subRes.data;
  const dashboard = dashboardRes.data as unknown as DailyDashboard | null;

  const isActive =
    subscription &&
    ['trialing', 'active'].includes(subscription.status) &&
    (!subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date());

  const isOnboarded = profile?.onboarding_completed === true;

  return (
    <div className="container-cdm py-12">
      {sp.checkout === 'success' && (
        <div className="card border-2 border-primary mb-8 flex items-center gap-4 animate-fade-in">
          <CheckCircle2 className="w-8 h-8 text-primary flex-shrink-0" />
          <div>
            <h3 className="font-bold mb-1">Bienvenue dans Coach DM Premium 🎉</h3>
            <p className="text-sm text-muted">
              Ton abonnement est actif. Télécharge l'app mobile pour démarrer ton suivi.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-primary text-sm font-bold tracking-widest uppercase mb-2">
            Bonjour {profile?.full_name?.split(' ')[0] ?? ''}
          </p>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
            Ton espace <span className="gold-text">Coach DM</span>
          </h1>
        </div>
      </div>

      {/* Subscription state */}
      {!isActive ? (
        <SubscriptionCTA />
      ) : !isOnboarded ? (
        <OnboardingCTA />
      ) : (
        <DashboardSummary dashboard={dashboard} subscription={subscription} />
      )}

      {/* Mobile downloads */}
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <a
          href="https://apps.apple.com/app/coach-dm"
          className="card hover:border-primary/30 transition-colors flex items-center gap-4"
        >
          <Apple className="w-10 h-10 text-primary" />
          <div className="flex-1">
            <p className="text-xs text-muted-dim uppercase tracking-widest">Télécharger sur</p>
            <p className="font-bold">App Store</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted" />
        </a>
        <a
          href="https://play.google.com/store/apps/details?id=be.coachdm.app"
          className="card hover:border-primary/30 transition-colors flex items-center gap-4"
        >
          <Smartphone className="w-10 h-10 text-primary" />
          <div className="flex-1">
            <p className="text-xs text-muted-dim uppercase tracking-widest">Disponible sur</p>
            <p className="font-bold">Google Play</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted" />
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CTA si pas d'abonnement
// ─────────────────────────────────────────────────────────────

function SubscriptionCTA() {
  return (
    <div className="card border-2 border-primary bg-dark-radial relative overflow-hidden">
      <div className="absolute -top-px -right-px bg-primary text-bg text-xs font-black px-4 py-1.5 rounded-bl-xl tracking-widest uppercase">
        7 jours gratuits
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <span className="text-primary text-xs font-bold tracking-widest uppercase">
          Activer mon compte
        </span>
      </div>

      <h2 className="text-3xl font-black mb-3">
        Démarre ton essai gratuit
      </h2>
      <p className="text-muted mb-6 max-w-2xl">
        Coach DM Premium c'est <span className="text-white font-bold">19,99 €/mois</span>{' '}
        après 7 jours gratuits. Annulation à tout moment, sans engagement.
      </p>

      <ul className="space-y-2 mb-6">
        {[
          'Tracking nutrition complet (calories + 4 macros)',
          'Scanner code-barres illimité',
          'Plans calculés par formule scientifique',
          'Évolution poids et photos progression',
        ].map((b) => (
          <li key={b} className="flex items-center gap-2 text-sm text-muted">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            {b}
          </li>
        ))}
      </ul>

      <form action={startCheckoutAction}>
        <button type="submit" className="btn-primary text-base py-3.5">
          Démarrer maintenant
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="mt-3 text-xs text-muted-dim">
        Paiement sécurisé par Stripe · TVA incluse · Aucune CB demandée pour les 7 jours d'essai
      </p>
    </div>
  );
}

function OnboardingCTA() {
  return (
    <div className="card border-2 border-primary/30">
      <h2 className="text-2xl font-black mb-3">
        Plus qu'une étape : configure ton plan
      </h2>
      <p className="text-muted mb-6">
        Ouvre l'app mobile pour compléter ton onboarding et calculer tes macros sur-mesure.
      </p>
      <Link href="/app/account" className="btn-secondary">
        Retour au compte
      </Link>
    </div>
  );
}

function DashboardSummary({
  dashboard,
  subscription,
}: {
  dashboard: DailyDashboard | null;
  subscription: { status: string; trial_end: string | null; current_period_end: string | null } | null;
}) {
  const consumed = dashboard?.consumed;
  const target = dashboard?.target;
  const isTrialing = subscription?.status === 'trialing';
  const trialEnds = subscription?.trial_end ? new Date(subscription.trial_end) : null;

  return (
    <div className="space-y-6">
      {isTrialing && trialEnds && (
        <div className="card border border-primary/30 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <p className="text-sm">
            <span className="font-bold">Période d'essai active</span> jusqu'au{' '}
            {trialEnds.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-bold tracking-widest uppercase text-muted mb-4">
            Aujourd'hui
          </h3>
          {target && consumed ? (
            <>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-black gold-text">
                  {Math.round(consumed.kcal)}
                </span>
                <span className="text-muted">/ {Math.round(target.kcal)} kcal</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Macro label="P" v={consumed.protein_g} t={target.protein_g} c="text-accent-protein" />
                <Macro label="G" v={consumed.carbs_g} t={target.carbs_g} c="text-accent-carbs" />
                <Macro label="L" v={consumed.fat_g} t={target.fat_g} c="text-accent-fat" />
              </div>
            </>
          ) : (
            <p className="text-muted">
              Configure ton plan dans l'app mobile pour voir tes données.
            </p>
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-bold tracking-widest uppercase text-muted mb-4">
            Mon abonnement
          </h3>
          <div className="mb-4">
            <p className="text-2xl font-black">19,99 €<span className="text-base text-muted font-normal">/mois</span></p>
            <p className="text-sm text-muted mt-1">
              Statut : <span className="text-primary font-bold">{subscription?.status}</span>
            </p>
            {subscription?.current_period_end && (
              <p className="text-xs text-muted-dim mt-1">
                Renouvellement le{' '}
                {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <form action={openPortalAction}>
            <button type="submit" className="btn-secondary w-full">
              Gérer mon abonnement
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Macro({ label, v, t, c }: { label: string; v: number; t: number; c: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-black ${c}`}>{Math.round(v)}<span className="text-muted-dim text-sm">/{Math.round(t)}</span></p>
      <p className="text-xs text-muted-dim mt-0.5">{label}</p>
    </div>
  );
}
