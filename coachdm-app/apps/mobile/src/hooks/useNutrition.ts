// ═══════════════════════════════════════════════════════════════
// COACH DM — Hooks data (React Query)
// 
// Toutes les queries Supabase passent par ici. React Query gère
// cache, refetch, optimistic updates, online/offline.
// ═══════════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import {
  fetchAndMapBarcode,
  type DailyDashboard,
  type Food,
  type FoodLogWithFood,
  type WaterLog,
} from '@coachdm/shared';

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────

export function useDailyDashboard(date: Date = new Date()) {
  const dateStr = format(date, 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['dashboard', dateStr],
    queryFn: async (): Promise<DailyDashboard> => {
      const { data, error } = await supabase.rpc('get_daily_dashboard', {
        p_date: dateStr,
      });
      if (error) throw error;
      return data as unknown as DailyDashboard;
    },
    staleTime: 30_000,        // 30s
  });
}

// ─────────────────────────────────────────────────────────────
// Food logs du jour
// ─────────────────────────────────────────────────────────────

export function useFoodLogs(date: Date = new Date()) {
  const dateStr = format(date, 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['food_logs', dateStr],
    queryFn: async (): Promise<FoodLogWithFood[]> => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*, food:foods(*)')
        .eq('logged_date', dateStr)
        .order('logged_at', { ascending: true });
      if (error) throw error;
      return (data as unknown as FoodLogWithFood[]) ?? [];
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Recherche d'aliments (catalogue local)
// ─────────────────────────────────────────────────────────────

export function useFoodSearch(query: string) {
  return useQuery({
    queryKey: ['foods', 'search', query],
    queryFn: async (): Promise<Food[]> => {
      if (query.trim().length < 2) return [];
      const { data, error } = await supabase.rpc('search_foods', {
        p_query: query,
        p_limit: 30,
      });
      if (error) throw error;
      return (data as unknown as Food[]) ?? [];
    },
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────────────────────
// Scan code-barres → cache local OU OpenFoodFacts
// ─────────────────────────────────────────────────────────────

export async function lookupBarcode(barcode: string): Promise<Food | null> {
  // 1. Cache local
  const { data: cached } = await supabase
    .from('foods')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle();
  if (cached) return cached as unknown as Food;

  // 2. OpenFoodFacts
  const offMapped = await fetchAndMapBarcode(barcode);
  if (!offMapped) return null;

  // 3. Insert dans notre cache pour les prochains scans
  const { data: inserted, error } = await supabase
    .from('foods')
    .insert(offMapped)
    .select()
    .single();
  if (error) {
    console.warn('Barcode cache insert failed:', error.message);
    return null;
  }
  return inserted as unknown as Food;
}

// ─────────────────────────────────────────────────────────────
// Ajouter un food log
// ─────────────────────────────────────────────────────────────

export function useAddFoodLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      food: Food;
      meal_type:
        | 'breakfast'
        | 'lunch'
        | 'dinner'
        | 'snack'
        | 'pre_workout'
        | 'post_workout';
      quantity_g: number;
      logged_date: string;
      notes?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');

      // Snapshot des macros (immutables)
      const ratio = input.quantity_g / 100;
      const payload = {
        user_id: auth.user.id,
        food_id: input.food.id,
        logged_date: input.logged_date,
        meal_type: input.meal_type,
        quantity_g: input.quantity_g,
        kcal: Math.round(input.food.kcal_per_100g * ratio * 10) / 10,
        protein_g: Math.round(input.food.protein_per_100g * ratio * 10) / 10,
        carbs_g: Math.round(input.food.carbs_per_100g * ratio * 10) / 10,
        fat_g: Math.round(input.food.fat_per_100g * ratio * 10) / 10,
        fiber_g:
          Math.round((input.food.fiber_per_100g ?? 0) * ratio * 10) / 10,
        notes: input.notes ?? null,
      };

      const { data, error } = await supabase
        .from('food_logs')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['dashboard', vars.logged_date] });
      qc.invalidateQueries({ queryKey: ['food_logs', vars.logged_date] });
    },
  });
}

export function useDeleteFoodLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase.from('food_logs').delete().eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['food_logs'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Water log
// ─────────────────────────────────────────────────────────────

export function useAddWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount_ml: number) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('water_logs')
        .insert({
          user_id: auth.user.id,
          logged_date: today,
          amount_ml,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WaterLog;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Weight log
// ─────────────────────────────────────────────────────────────

export function useAddWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      weight_kg: number;
      logged_date: string;
      body_fat_percentage?: number;
      notes?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('weight_logs')
        .upsert(
          {
            user_id: auth.user.id,
            ...input,
          },
          { onConflict: 'user_id,logged_date' },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['weights'] });
    },
  });
}

export function useWeightHistory(days = 90) {
  return useQuery({
    queryKey: ['weights', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .gte('logged_date', format(since, 'yyyy-MM-dd'))
        .order('logged_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
