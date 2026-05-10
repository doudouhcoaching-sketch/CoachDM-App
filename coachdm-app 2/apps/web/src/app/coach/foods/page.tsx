// ═══════════════════════════════════════════════════════════════
// COACH DM — /coach/foods
// 
// Modération du catalogue : valider/refuser les aliments custom
// créés par les users + ceux importés d'OpenFoodFacts.
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { CheckCircle2, Trash2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Server Actions
// ─────────────────────────────────────────────────────────────

async function verifyFood(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const admin = createAdminClient();
  await admin.from('foods').update({ is_verified: true }).eq('id', id);
  revalidatePath('/coach/foods');
}

async function deleteFood(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const admin = createAdminClient();
  await admin.from('foods').delete().eq('id', id);
  revalidatePath('/coach/foods');
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default async function CoachFoodsPage() {
  const admin = createAdminClient();
  const { data: pending = [] } = await admin
    .from('foods')
    .select('*')
    .eq('is_verified', false)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="container-cdm py-12">
      <h1 className="text-4xl font-black tracking-tight mb-2">Aliments à modérer</h1>
      <p className="text-muted mb-10">
        {pending?.length ?? 0} aliment(s) en attente de validation
      </p>

      <div className="card p-0 overflow-hidden">
        {pending && pending.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-muted text-xs uppercase tracking-widest">
                <th className="text-left py-4 px-6 font-medium">Aliment</th>
                <th className="text-left py-4 px-6 font-medium">Source</th>
                <th className="text-right py-4 px-6 font-medium">Kcal/100g</th>
                <th className="text-right py-4 px-6 font-medium">P / G / L</th>
                <th className="w-32"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((f) => (
                <tr key={f.id} className="border-b border-border-subtle hover:bg-bg-elevated">
                  <td className="py-4 px-6">
                    <p className="font-medium">{f.name_fr}</p>
                    {f.brand && <p className="text-xs text-muted-dim">{f.brand}</p>}
                    {f.barcode && (
                      <p className="text-xs text-muted-dim font-mono mt-1">
                        EAN: {f.barcode}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {f.is_custom ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-accent-carbs/15 text-accent-carbs font-bold">
                        Custom user
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-accent-fat/15 text-accent-fat font-bold">
                        OpenFoodFacts
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right font-bold">
                    {Math.round(f.kcal_per_100g)}
                  </td>
                  <td className="py-4 px-6 text-right text-muted text-xs">
                    {f.protein_per_100g} / {f.carbs_per_100g} / {f.fat_per_100g}
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex justify-end gap-2">
                      <form action={verifyFood}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          title="Valider"
                          className="w-9 h-9 rounded-lg bg-accent-fiber/15 text-accent-fiber hover:bg-accent-fiber hover:text-bg flex items-center justify-center transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </form>
                      <form action={deleteFood}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          title="Supprimer"
                          className="w-9 h-9 rounded-lg bg-accent-protein/15 text-accent-protein hover:bg-accent-protein hover:text-bg flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted">
              Aucun aliment en attente. La modération est à jour 🎉
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
