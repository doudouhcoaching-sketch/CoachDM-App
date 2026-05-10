// ═══════════════════════════════════════════════════════════════
// COACH DM — Layout /app (espace abonné)
// 
// Server Component : protège la route, charge le profil + sub.
// ═══════════════════════════════════════════════════════════════

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, CreditCard, LayoutDashboard, Smartphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from '@/lib/actions';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single();

  const isCoach = profile?.role === 'coach' || profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-border-subtle">
        <div className="container-cdm h-16 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-primary flex items-center justify-center">
              <span className="text-primary font-black text-xs tracking-widest">DM</span>
            </div>
            <span className="font-black tracking-widest text-sm hidden sm:inline">COACH DM</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/app"
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted hover:text-white transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            {isCoach && (
              <Link
                href="/coach"
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted hover:text-white transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Coach</span>
              </Link>
            )}
            <Link
              href="/app/account"
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted hover:text-white transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Compte</span>
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted hover:text-accent-protein transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border-subtle py-6">
        <div className="container-cdm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-dim">
          <span>© {new Date().getFullYear()} Coach DM · BCE BE0840.260.421</span>
          <div className="flex gap-4">
            <Link href="https://coachdm.be" target="_blank" className="hover:text-white">
              coachdm.be
            </Link>
            <Link href="https://coachdm.be/cgv" target="_blank" className="hover:text-white">
              CGV
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
