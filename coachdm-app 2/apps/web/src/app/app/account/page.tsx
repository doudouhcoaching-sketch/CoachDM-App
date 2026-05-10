// ═══════════════════════════════════════════════════════════════
// COACH DM — /app/account
// 
// Gestion détaillée du compte et abonnement.
// ═══════════════════════════════════════════════════════════════

import { redirect } from 'next/navigation';
import { CreditCard, User, Mail, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { openPortalAction, startCheckoutAction } from '@/lib/actions';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing: { label: 'Période d\'essai', color: 'text-primary' },
  active: { label: 'Actif', color: 'text-accent-fiber' },
  past_due: { label: 'Paiement en retard', color: 'text-accent-protein' },
  canceled: { label: 'Annulé', color: 'text-muted' },
  incomplete: { label: 'Incomplet', color: 'text-accent-protein' },
  paused: { label: 'En pause', color: 'text-muted' },
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  const status = sub?.status ? STATUS_LABELS[sub.status] : null;
  const isActive =
    sub && ['trialing', 'active'].includes(sub.status) &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

  return (
    <div className="container-cdm py-12 max-w-3xl">
      <h1 className="text-4xl font-black mb-2 tracking-tight">Mon compte</h1>
      <p className="text-muted mb-10">Informations personnelles et gestion de l'abonnement</p>

      {/* Profil */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Profil</h2>
        </div>

        <div className="space-y-4">
          <Field icon={User} label="Nom" value={profile?.full_name ?? '—'} />
          <Field icon={Mail} label="Email" value={user.email ?? '—'} />
        </div>

        <p className="text-xs text-muted-dim mt-6">
          Pour modifier ces informations, ouvre l'app mobile → Profil → Préférences.
        </p>
      </div>

      {/* Abonnement */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Abonnement</h2>
        </div>

        {sub ? (
          <>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between py-3 border-b border-border-subtle">
                <span className="text-muted">Plan</span>
                <span className="font-bold">Coach DM Premium</span>
              </div>
              <div className="flex justify-between py-3 border-b border-border-subtle">
                <span className="text-muted">Tarif</span>
                <span className="font-bold">19,99 € / mois</span>
              </div>
              <div className="flex justify-between py-3 border-b border-border-subtle">
                <span className="text-muted">Statut</span>
                <span className={`font-bold ${status?.color ?? 'text-muted'}`}>
                  {status?.label ?? sub.status}
                </span>
              </div>
              {sub.trial_end && new Date(sub.trial_end) > new Date() && (
                <div className="flex justify-between py-3 border-b border-border-subtle">
                  <span className="text-muted">Fin de la période d'essai</span>
                  <span className="font-bold">
                    {new Date(sub.trial_end).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {sub.current_period_end && (
                <div className="flex justify-between py-3 border-b border-border-subtle">
                  <span className="text-muted">
                    {sub.cancel_at_period_end ? 'Fin d\'accès' : 'Prochain prélèvement'}
                  </span>
                  <span className="font-bold">
                    {new Date(sub.current_period_end).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {sub.cancel_at_period_end && (
                <div className="p-3 rounded-lg bg-accent-protein/10 border border-accent-protein/30 text-accent-protein text-sm">
                  Ton abonnement sera résilié à la fin de la période en cours.
                </div>
              )}
            </div>

            {isActive ? (
              <form action={openPortalAction}>
                <button type="submit" className="btn-primary w-full">
                  Gérer (carte, factures, annulation)
                  <ExternalLink className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form action={startCheckoutAction}>
                <button type="submit" className="btn-primary w-full">
                  Réactiver mon abonnement
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <p className="text-muted mb-6">
              Aucun abonnement actif. Démarre ton essai gratuit de 7 jours.
            </p>
            <form action={startCheckoutAction}>
              <button type="submit" className="btn-primary w-full">
                Démarrer l'essai gratuit
              </button>
            </form>
          </>
        )}
      </div>

      <p className="text-xs text-muted-dim mt-8 text-center">
        Pour toute question : <a href="mailto:[email protected]" className="text-primary">[email protected]</a>
        {' · '}Coach DM · BCE BE0840.260.421
      </p>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-dim" />
      <div className="flex-1 flex justify-between items-center">
        <span className="text-muted text-sm">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}
