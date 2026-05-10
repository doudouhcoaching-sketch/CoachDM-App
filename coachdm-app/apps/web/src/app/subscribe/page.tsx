// ═══════════════════════════════════════════════════════════════
// COACH DM — /subscribe
// 
// Page atterrissage depuis le mobile (subscription modal redirige ici).
// Si user connecté → checkout direct, sinon login puis checkout.
// ═══════════════════════════════════════════════════════════════

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { startCheckoutAction } from '@/lib/actions';

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in?next=/subscribe');
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6 bg-dark-radial">
      <div className="max-w-md w-full">
        <Link href="/" className="flex items-center justify-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-full border-2 border-primary flex items-center justify-center">
            <span className="text-primary font-black tracking-widest">DM</span>
          </div>
          <span className="font-black tracking-widest">COACH DM</span>
        </Link>

        <div className="card border-2 border-primary relative overflow-hidden">
          <div className="absolute -top-px -right-px bg-primary text-bg text-xs font-black px-4 py-1.5 rounded-bl-xl tracking-widest uppercase">
            7 jours gratuits
          </div>

          <h1 className="text-3xl font-black mb-2">Coach DM Premium</h1>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-5xl font-black gold-text">19,99 €</span>
            <span className="text-muted">/mois</span>
          </div>

          <ul className="space-y-3 mb-8">
            {[
              'Tracking nutrition complet',
              'Scanner code-barres illimité',
              'Plans calculés sur-mesure',
              'Évolution poids et progression',
              'Annulation à tout moment',
            ].map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted">{b}</span>
              </li>
            ))}
          </ul>

          {sp.checkout === 'cancel' && (
            <div className="p-3 rounded-lg bg-accent-protein/10 border border-accent-protein/30 text-accent-protein text-sm mb-4">
              Paiement annulé. Tu peux réessayer quand tu veux.
            </div>
          )}

          <form action={startCheckoutAction}>
            <button type="submit" className="btn-primary w-full text-base py-4">
              Démarrer mon essai gratuit
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-xs text-muted-dim text-center mt-4">
            Sans CB pour les 7 jours d'essai. Paiement sécurisé via Stripe.
          </p>
        </div>
      </div>
    </main>
  );
}
