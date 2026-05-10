'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signupSchema } from '@coachdm/shared';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parse = signupSchema.safeParse({
      full_name: fullName,
      email,
      password,
      locale: 'fr',
    });
    if (!parse.success) {
      setError(parse.error.issues[0]?.message ?? 'Données invalides');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: parse.data.email,
        password: parse.data.password,
        options: {
          data: {
            full_name: parse.data.full_name,
            locale: parse.data.locale,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center p-6 bg-dark-radial">
        <div className="card max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-3">Vérifie tes emails</h1>
          <p className="text-muted mb-6">
            On vient de t'envoyer un lien de confirmation à <span className="text-white font-semibold">{email}</span>.
            Clique dessus pour activer ton compte.
          </p>
          <Link href="/sign-in" className="btn-secondary">
            Retour connexion
          </Link>
        </div>
      </main>
    );
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
          <h1 className="text-3xl font-black mb-2 tracking-tight">Créer un compte</h1>
          <p className="text-muted mb-8">7 jours d'essai gratuit. Aucune CB.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Nom complet
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
                className="input"
                placeholder="Ton nom"
              />
            </div>

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
                autoComplete="new-password"
                required
                className="input"
                placeholder="Min 8 car., 1 maj., 1 chiffre"
              />
              <p className="text-xs text-muted-dim mt-2">
                Min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre.
              </p>
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
                  Créer mon compte
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Déjà un compte ?{' '}
            <Link href="/sign-in" className="text-primary hover:text-primary-light font-medium">
              Se connecter
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-muted-dim">
            En créant un compte, tu acceptes nos CGV et notre Politique de confidentialité.
          </p>
        </div>
      </div>
    </main>
  );
}
