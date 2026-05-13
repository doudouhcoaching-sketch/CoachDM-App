// apps/web/app/admin/workouts/exercises/page.tsx
// COACH DM — Back-office: gestion banque d'exercices

'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Exercise, MovementPattern, ExerciseModality, WorkoutGoal } from '@coachdm/shared/workouts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true } }
);

const PATTERNS: MovementPattern[] = [
  'squat', 'hinge', 'lunge', 'horizontal_push', 'horizontal_pull',
  'vertical_push', 'vertical_pull', 'carry', 'rotation', 'core',
  'gait', 'jump', 'olympic', 'gymnastics', 'mobility',
];
const MODALITIES: ExerciseModality[] = [
  'barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'bodyweight',
  'resistance_band', 'sled', 'rower', 'bike', 'ski_erg', 'run', 'medball',
  'box', 'rings', 'pull_up_bar', 'sandbag', 'wall_ball',
];
const GOALS: WorkoutGoal[] = ['fat_loss', 'strength', 'functional', 'sport', 'travel_home', 'mobility'];

export default function AdminExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [filterPattern, setFilterPattern] = useState<string>('');
  const [filterModality, setFilterModality] = useState<string>('');
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name_fr', { ascending: true });
    if (error) {
      alert(error.message);
    } else {
      setExercises((data ?? []) as Exercise[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      if (filterPattern && e.pattern !== filterPattern) return false;
      if (filterModality && e.modality !== filterModality) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !e.name_fr.toLowerCase().includes(s) &&
          !e.name_en.toLowerCase().includes(s) &&
          !e.name_nl.toLowerCase().includes(s) &&
          !e.slug.includes(s)
        ) return false;
      }
      return true;
    });
  }, [exercises, search, filterPattern, filterModality]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[#D4AF37] text-xs tracking-[3px] font-bold">COACH DM · ADMIN</p>
            <h1 className="text-3xl font-black mt-2">Banque d'exercices</h1>
            <p className="text-[#888] mt-1">{exercises.length} exercices · {filtered.length} affichés</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="bg-[#D4AF37] text-black px-5 py-3 rounded-lg font-black hover:opacity-85"
          >
            + Nouvel exercice
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche FR/EN/NL/slug…"
            className="bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white"
          />
          <select
            value={filterPattern}
            onChange={(e) => setFilterPattern(e.target.value)}
            className="bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white"
          >
            <option value="">Tous les patterns</option>
            {PATTERNS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={filterModality}
            onChange={(e) => setFilterModality(e.target.value)}
            className="bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white"
          >
            <option value="">Toutes modalités</option>
            {MODALITIES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-[#888]">Chargement…</p>
        ) : (
          <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1F1F1F]">
                <tr>
                  <th className="text-left p-3 text-[#D4AF37] font-bold tracking-wider text-xs uppercase">Nom (FR)</th>
                  <th className="text-left p-3 text-[#D4AF37] font-bold tracking-wider text-xs uppercase">Pattern</th>
                  <th className="text-left p-3 text-[#D4AF37] font-bold tracking-wider text-xs uppercase">Modalité</th>
                  <th className="text-left p-3 text-[#D4AF37] font-bold tracking-wider text-xs uppercase">Niveau</th>
                  <th className="text-left p-3 text-[#D4AF37] font-bold tracking-wider text-xs uppercase">Tip</th>
                  <th className="text-left p-3 text-[#D4AF37] font-bold tracking-wider text-xs uppercase">Réf.</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t border-[#262626] hover:bg-[#1A1A1A]">
                    <td className="p-3">
                      <div className="font-semibold">{e.name_fr}</div>
                      <div className="text-[#888] text-xs">{e.slug}</div>
                    </td>
                    <td className="p-3 text-[#888]">{e.pattern}</td>
                    <td className="p-3 text-[#888]">{e.modality}</td>
                    <td className="p-3 text-[#888]">{e.difficulty}</td>
                    <td className="p-3">
                      <span className={`inline-block w-3 h-3 rounded-full ${
                        e.tip_color === 'green' ? 'bg-[#10B981]' :
                        e.tip_color === 'red' ? 'bg-[#EF4444]' :
                        e.tip_color === 'blue' ? 'bg-[#38BDF8]' : 'bg-[#A78BFA]'
                      }`} />
                    </td>
                    <td className="p-3 text-[#888] text-xs italic">{e.reference_citation || '—'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setEditing(e)}
                        className="text-[#D4AF37] hover:underline text-sm"
                      >
                        Éditer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(editing || creating) && (
          <ExerciseEditor
            exercise={editing}
            onClose={() => {
              setEditing(null);
              setCreating(false);
            }}
            onSaved={() => {
              setEditing(null);
              setCreating(false);
              load();
            }}
          />
        )}
      </div>
    </div>
  );
}

function ExerciseEditor({
  exercise,
  onClose,
  onSaved,
}: {
  exercise: Exercise | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Exercise>>(
    exercise ?? {
      slug: '',
      name_fr: '',
      name_en: '',
      name_nl: '',
      pattern: 'squat',
      modality: 'barbell',
      difficulty: 'intermediate',
      primary_muscles: [],
      secondary_muscles: [],
      goals: [],
      cues_fr: '',
      cues_en: '',
      cues_nl: '',
      tip_color: 'blue',
      is_unilateral: false,
      requires_spotter: false,
      is_active: true,
    }
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = { ...form };
    if (exercise) {
      const { error } = await supabase.from('exercises').update(payload).eq('id', exercise.id);
      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('exercises').insert(payload);
      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onSaved();
  };

  const setField = <K extends keyof Exercise>(key: K, value: Exercise[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] border border-[#D4AF37] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black">
            {exercise ? 'Éditer' : 'Nouvel'} exercice
          </h2>
          <button onClick={onClose} className="text-[#888] hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <Field label="Slug (unique, kebab-case)">
            <input
              value={form.slug ?? ''}
              onChange={(e) => setField('slug', e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white"
              placeholder="back-squat"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Nom FR (priorité)">
              <input
                value={form.name_fr ?? ''}
                onChange={(e) => setField('name_fr', e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white font-bold"
              />
            </Field>
            <Field label="Name EN">
              <input
                value={form.name_en ?? ''}
                onChange={(e) => setField('name_en', e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white"
              />
            </Field>
            <Field label="Naam NL">
              <input
                value={form.name_nl ?? ''}
                onChange={(e) => setField('name_nl', e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white italic"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Pattern">
              <select
                value={form.pattern}
                onChange={(e) => setField('pattern', e.target.value as MovementPattern)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white"
              >
                {PATTERNS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Modalité">
              <select
                value={form.modality}
                onChange={(e) => setField('modality', e.target.value as ExerciseModality)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white"
              >
                {MODALITIES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Difficulté">
              <select
                value={form.difficulty}
                onChange={(e) => setField('difficulty', e.target.value as Exercise['difficulty'])}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white"
              >
                <option>beginner</option>
                <option>intermediate</option>
                <option>advanced</option>
                <option>rx</option>
              </select>
            </Field>
          </div>

          <Field label="Goals (multi-select)">
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => {
                const active = (form.goals ?? []).includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      const cur = form.goals ?? [];
                      setField('goals', active ? cur.filter((x) => x !== g) : [...cur, g]);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      active
                        ? 'bg-[#D4AF37] text-black'
                        : 'bg-[#0A0A0A] text-[#888] border border-[#262626]'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Cues FR">
              <textarea
                value={form.cues_fr ?? ''}
                onChange={(e) => setField('cues_fr', e.target.value)}
                rows={3}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white text-sm font-bold"
              />
            </Field>
            <Field label="Cues EN">
              <textarea
                value={form.cues_en ?? ''}
                onChange={(e) => setField('cues_en', e.target.value)}
                rows={3}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white text-sm"
              />
            </Field>
            <Field label="Cues NL">
              <textarea
                value={form.cues_nl ?? ''}
                onChange={(e) => setField('cues_nl', e.target.value)}
                rows={3}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white text-sm italic"
              />
            </Field>
          </div>

          <Field label="Tip code couleur">
            <div className="flex gap-2">
              {(['green', 'red', 'blue', 'violet'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setField('tip_color', c)}
                  className={`px-4 py-2 rounded font-bold text-sm ${
                    form.tip_color === c
                      ? c === 'green' ? 'bg-[#10B981] text-black' :
                        c === 'red' ? 'bg-[#EF4444] text-white' :
                        c === 'blue' ? 'bg-[#38BDF8] text-black' : 'bg-[#A78BFA] text-black'
                      : 'bg-[#0A0A0A] text-[#888] border border-[#262626]'
                  }`}
                >
                  {c === 'green' ? '✓ Insight' : c === 'red' ? '✗ Warning' : c === 'blue' ? 'ⓘ Info' : '⚑ Tactic'}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Tip FR">
              <textarea
                value={form.tip_fr ?? ''}
                onChange={(e) => setField('tip_fr', e.target.value)}
                rows={2}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white text-sm"
              />
            </Field>
            <Field label="Tip EN">
              <textarea
                value={form.tip_en ?? ''}
                onChange={(e) => setField('tip_en', e.target.value)}
                rows={2}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white text-sm"
              />
            </Field>
            <Field label="Tip NL">
              <textarea
                value={form.tip_nl ?? ''}
                onChange={(e) => setField('tip_nl', e.target.value)}
                rows={2}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white text-sm"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Référence (auteur année)">
              <input
                value={form.reference_citation ?? ''}
                onChange={(e) => setField('reference_citation', e.target.value)}
                placeholder="Schoenfeld 2010"
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white"
              />
            </Field>
            <Field label="Vidéo YouTube Coach DM">
              <input
                value={form.video_url ?? ''}
                onChange={(e) => setField('video_url', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-white"
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-[#262626] text-[#888] hover:text-white"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black font-black disabled:opacity-50"
          >
            {saving ? '...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider font-bold text-[#888] mb-1">{label}</label>
      {children}
    </div>
  );
}
