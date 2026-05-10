// ═══════════════════════════════════════════════════════════════
// COACH DM — /coach/clients/[id]
// 
// Fiche détaillée d'un client : profil, plan nutritionnel actif,
// historique poids, journal alimentaire récent.
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Mail,
  Scale,
  Flame,
  TrendingUp,
  CalendarDays,
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { calculateAge, type NutritionGoal } from '@coachdm/shared';

const GOAL_LABELS: Record<NutritionGoal, string> = {
  lose_fat: 'Sèche',
  maintain: 'Maintien',
  build_muscle: 'Prise de muscle',
  recomp: 'Recomposition',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sédentaire',
  light: 'Légère',
  moderate: 'Modérée',
  active: 'Active',
  very_active: 'Très active',
};

export default async function CoachClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [
    { data: profile },
    { data: target },
    { data: weights },
    { data: recentLogs },
    { data: subscription },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).single(),
    admin
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', id)
      .eq('is_active', true)
      .maybeSingle(),
    admin
      .from('weight_logs')
      .select('*')
      .eq('user_id', id)
      .order('logged_date', { ascending: false })
      .limit(30),
    admin
      .from('food_logs')
      .select('*, food:foods(name_fr, brand)')
      .eq('user_id', id)
      .order('logged_at', { ascending: false })
      .limit(20),
    admin.from('subscriptions').select('*').eq('user_id', id).maybeSingle(),
  ]);

  if (!profile) notFound();

  const age = profile.date_of_birth ? calculateAge(profile.date_of_birth) : null;
  const lastWeight = weights?.[0]?.weight_kg;
  const firstWeight = weights?.[weights.length - 1]?.weight_kg;
  const weightDelta =
    lastWeight && firstWeight ? Number(lastWeight) - Number(firstWeight) : null;

  return (
    <div className="container-cdm py-12">
      <Link
        href="/coach/clients"
        className="inline-flex items-center gap-2 text-muted hover:text-white text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à la liste
      </Link>

      {/* Header */}
      <div className="flex items-center gap-6 mb-10 flex-wrap">
        <div className="w-20 h-20 rounded-full border-2 border-primary flex items-center justify-center bg-surface">
          <span className="text-primary text-2xl font-black tracking-widest">
            {(profile.full_name ?? profile.email)
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-black tracking-tight">
            {profile.full_name ?? '—'}
          </h1>
          <p className="text-muted">{profile.email}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {age != null && (
              <Badge>
                <Calendar className="w-3 h-3" />
                {age} ans
              </Badge>
            )}
            {profile.sex && (
              <Badge>{profile.sex === 'male' ? 'Homme' : 'Femme'}</Badge>
            )}
            {profile.height_cm && <Badge>{profile.height_cm} cm</Badge>}
            {subscription && (
              <Badge variant="primary">
                {subscription.status}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Plan nutritionnel */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center gap-3 mb-6">
            <Flame className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Plan nutritionnel actif</h2>
          </div>

          {target ? (
            <>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black gold-text">
                  {target.daily_calories_kcal}
                </span>
                <span className="text-muted">kcal / jour</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <MacroBlock label="Protéines" value={target.protein_g} unit="g" color="text-accent-protein" />
                <MacroBlock label="Glucides" value={target.carbs_g} unit="g" color="text-accent-carbs" />
                <MacroBlock label="Lipides" value={target.fat_g} unit="g" color="text-accent-fat" />
                <MacroBlock label="Fibres" value={target.fiber_g} unit="g" color="text-accent-fiber" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Objectif" value={GOAL_LABELS[target.goal as NutritionGoal]} />
                <Field
                  label="Activité"
                  value={ACTIVITY_LABELS[target.activity_level] ?? target.activity_level}
                />
                <Field label="BMR" value={`${target.bmr_kcal} kcal`} />
                <Field label="TDEE" value={`${target.tdee_kcal} kcal`} />
                <Field label="Méthode" value={target.calculation_method} />
                <Field label="Hydratation" value={`${target.water_ml} ml`} />
              </div>
            </>
          ) : (
            <p className="text-muted">Aucun plan nutritionnel actif.</p>
          )}
        </div>

        {/* Évolution poids */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Scale className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Poids</h2>
          </div>

          {lastWeight ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black">{Number(lastWeight).toFixed(1)}</span>
                <span className="text-muted">kg</span>
              </div>
              {weightDelta != null && (
                <p
                  className={`text-sm font-bold ${
                    weightDelta < 0 ? 'text-accent-fiber' : weightDelta > 0 ? 'text-accent-protein' : 'text-muted'
                  }`}
                >
                  {weightDelta > 0 ? '+' : ''}
                  {weightDelta.toFixed(1)} kg sur {weights?.length} pesées
                </p>
              )}

              <div className="mt-6 space-y-2 max-h-64 overflow-y-auto">
                {weights?.slice(0, 10).map((w) => (
                  <div key={w.id} className="flex justify-between text-sm py-2 border-b border-border-subtle">
                    <span className="text-muted">
                      {new Date(w.logged_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="font-bold">{Number(w.weight_kg).toFixed(1)} kg</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted text-sm">Aucune pesée enregistrée.</p>
          )}
        </div>
      </div>

      {/* Journal récent */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Journal alimentaire récent</h2>
        </div>

        {recentLogs && recentLogs.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-muted text-xs uppercase tracking-widest">
                <th className="text-left py-3 font-medium">Date</th>
                <th className="text-left py-3 font-medium">Repas</th>
                <th className="text-left py-3 font-medium">Aliment</th>
                <th className="text-right py-3 font-medium">Quantité</th>
                <th className="text-right py-3 font-medium">Kcal</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log: any) => (
                <tr key={log.id} className="border-b border-border-subtle">
                  <td className="py-3 text-muted-dim text-xs">
                    {new Date(log.logged_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3">
                    <span className="text-xs uppercase tracking-widest text-primary font-bold">
                      {log.meal_type}
                    </span>
                  </td>
                  <td className="py-3">
                    <p className="font-medium">{log.food?.name_fr ?? '—'}</p>
                    {log.food?.brand && (
                      <p className="text-xs text-muted-dim">{log.food.brand}</p>
                    )}
                  </td>
                  <td className="py-3 text-right text-muted">
                    {Math.round(log.quantity_g)} g
                  </td>
                  <td className="py-3 text-right font-bold">
                    {Math.round(log.kcal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted text-sm">Aucun aliment enregistré.</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composants locaux
// ─────────────────────────────────────────────────────────────

function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'primary';
}) {
  const styles =
    variant === 'primary'
      ? 'bg-primary/10 text-primary border-primary/30'
      : 'bg-surface text-muted border-border';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-widest ${styles}`}
    >
      {children}
    </span>
  );
}

function MacroBlock({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="bg-bg-elevated rounded-xl p-4">
      <p className="text-xs text-muted-dim uppercase tracking-widest font-bold mb-1">
        {label}
      </p>
      <p className={`text-2xl font-black ${color}`}>
        {Math.round(value)}
        <span className="text-base text-muted-dim font-normal"> {unit}</span>
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-dim uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
