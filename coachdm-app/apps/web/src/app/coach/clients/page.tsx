// ═══════════════════════════════════════════════════════════════
// COACH DM — /coach/clients
// 
// Liste tous les clients : nom, état abonnement, dernier poids,
// dernière connexion, accès rapide à leur dashboard.
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { ChevronRight, Search } from 'lucide-react';

export default async function CoachClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? '';
  const admin = createAdminClient();

  let query = admin
    .from('profiles')
    .select('*, subscription:subscriptions(status, current_period_end)')
    .eq('role', 'client')
    .order('created_at', { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: clients = [] } = await query;

  return (
    <div className="container-cdm py-12">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Clients</h1>
          <p className="text-muted mt-1">{clients?.length ?? 0} client·e·s</p>
        </div>

        <form className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dim" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher nom ou email..."
            className="input pl-11 w-72"
          />
        </form>
      </div>

      <div className="card p-0 overflow-hidden">
        {clients && clients.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-muted text-xs uppercase tracking-widest">
                <th className="text-left py-4 px-6 font-medium">Client</th>
                <th className="text-left py-4 px-6 font-medium">Onboarding</th>
                <th className="text-left py-4 px-6 font-medium">Abonnement</th>
                <th className="text-left py-4 px-6 font-medium">Inscrit</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c: any) => {
                const sub = Array.isArray(c.subscription) ? c.subscription[0] : c.subscription;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-border-subtle hover:bg-bg-elevated transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium">{c.full_name ?? '—'}</p>
                        <p className="text-xs text-muted-dim">{c.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {c.onboarding_completed ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-accent-fiber/15 text-accent-fiber font-bold">
                          Complété
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-muted/15 text-muted font-bold">
                          En cours
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {sub ? (
                        <span className={`text-xs font-bold uppercase tracking-widest ${
                          sub.status === 'active' ? 'text-accent-fiber' :
                          sub.status === 'trialing' ? 'text-primary' :
                          'text-muted'
                        }`}>
                          {sub.status}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-dim">Pas d'abo</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-muted">
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-4 px-2 text-right">
                      <Link
                        href={`/coach/clients/${c.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface text-muted hover:text-primary transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted">
              {q ? 'Aucun client trouvé pour cette recherche.' : 'Aucun client pour l\'instant.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
