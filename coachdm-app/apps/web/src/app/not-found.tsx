import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6 bg-dark-radial">
      <div className="text-center">
        <p className="text-primary text-xs font-bold tracking-widest uppercase mb-4">
          Erreur 404
        </p>
        <h1 className="text-6xl lg:text-8xl font-black gold-text tracking-tightest mb-6">
          Perdu ?
        </h1>
        <p className="text-muted text-lg mb-10 max-w-md">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link href="/" className="btn-primary">
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}
