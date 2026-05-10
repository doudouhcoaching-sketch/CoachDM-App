'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signinSchema } from '@coachdm/shared';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowRight } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parse = signinSchema.safeParse({ email, password });
    if (!parse.success) {
      setError(parse.error.issues[0]?.message ?? 'Données invalides');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: parse.data.email,
        password: parse.data.password,
      });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6 bg-dark-radial">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-full border-2 border-primary flex items-center justify-center">
            <span className="text-primary font-black tracking-widest">DM</span>
          </div>
          <span className="font-black tracking-widest">COACH DM</span>
        </Link>

        <div className="card">
          <h1 className="text-3xl font-black mb-2 tracking-tight">Bon retour</h1>
          <p className="text-muted mb-8">Connecte-toi pour continuer.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="input"
                placeholder="[email protected]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-accent-protein/10 border border-accent-protein/30 text-accent-protein text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base py-3.5 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link
              href="/forgot-password"
              className="block text-sm text-primary hover:text-primary-light"
            >
              Mot de passe oublié ?
            </Link>
            <p className="text-sm text-muted">
              Pas de compte ?{' '}
              <Link href="/sign-up" className="text-primary hover:text-primary-light font-medium">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
