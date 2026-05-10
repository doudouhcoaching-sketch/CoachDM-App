import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, BarChart3, BookOpen, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'coach' && profile?.role !== 'admin') {
    redirect('/app');
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-border-subtle">
        <div className="container-cdm h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/app" className="flex items-center gap-2 text-muted hover:text-white text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>Retour app</span>
            </Link>
            <span className="text-primary text-xs font-bold tracking-widest uppercase">
              Espace Coach
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink href="/coach" icon={BarChart3} label="Vue d'ensemble" />
            <NavLink href="/coach/clients" icon={Users} label="Clients" />
            <NavLink href="/coach/foods" icon={BookOpen} label="Aliments" />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 text-sm text-muted hover:text-white transition-colors"
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
