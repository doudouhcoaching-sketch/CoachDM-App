'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="card max-w-md w-full">
        {sent ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-primary mb-4" />
            <h1 className="text-2xl font-black mb-2">Email envoyé</h1>
            <p className="text-muted mb-6">
              Si un compte existe pour {email}, tu recevras un lien de réinitialisation.
            </p>
            <Link href="/sign-in" className="btn-secondary">
              Retour
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black mb-2 tracking-tight">Mot de passe oublié</h1>
            <p className="text-muted mb-6">
              On t'enverra un lien pour le réinitialiser.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="[email protected]"
                className="input"
              />
              <button type="submit" disabled={loading} className="btn-primary w-full">
                Envoyer le lien
              </button>
            </form>
            <Link href="/sign-in" className="block text-center text-sm text-primary mt-6">
              Retour connexion
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
