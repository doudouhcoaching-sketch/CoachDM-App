// ============================================================
// Coach DM · Shared · Coach management & plans (Supabase)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CoachClient,
  CoachClientStatus,
  CoachProfile,
  CoachSubscription,
  AssignedPlan,
  AssignedPlanWorkout,
  AssignedPlanMeal,
} from './types';

export function createCoachClient(supabase: SupabaseClient) {
  return {
    // ── Profile ────────────────────────────────────────────────
    async getMyCoachProfile(): Promise<CoachProfile | null> {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from('coach_profiles')
        .select('*')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async upsertMyCoachProfile(patch: Partial<CoachProfile>): Promise<CoachProfile> {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('coach_profiles')
        .upsert({ ...patch, user_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async listActiveCoaches(): Promise<CoachProfile[]> {
      const { data, error } = await supabase
        .from('coach_profiles')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      if (error) throw error;
      return data ?? [];
    },

    // ── Clients (coach-side) ───────────────────────────────────
    async listMyClients(
      status: CoachClientStatus | 'all' = 'active'
    ): Promise<Array<CoachClient & { client_full_name: string; client_email: string }>> {
      let q = supabase
        .from('coach_clients')
        .select(`
          *,
          client:profiles!coach_clients_client_user_id_fkey(full_name, email, avatar_url)
        `)
        .order('started_at', { ascending: false });
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        client_full_name: row.client?.full_name ?? '',
        client_email: row.client?.email ?? '',
      }));
    },

    async assignClient(clientUserId: string, notes?: string): Promise<CoachClient> {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('coach_clients')
        .insert({
          coach_user_id: auth.user.id,
          client_user_id: clientUserId,
          status: 'active',
          notes: notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async updateClientStatus(
      assignmentId: string,
      status: CoachClientStatus
    ): Promise<CoachClient> {
      const { data, error } = await supabase
        .from('coach_clients')
        .update({
          status,
          ended_at: status === 'archived' ? new Date().toISOString() : null,
        })
        .eq('id', assignmentId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async updateClientNotes(assignmentId: string, notes: string): Promise<void> {
      const { error } = await supabase
        .from('coach_clients')
        .update({ notes })
        .eq('id', assignmentId);
      if (error) throw error;
    },

    // ── Coaches (client-side) ──────────────────────────────────
    async listMyCoaches(): Promise<Array<CoachClient & { coach: CoachProfile }>> {
      const { data, error } = await supabase
        .from('coach_clients')
        .select(`*, coach:coach_profiles!coach_clients_coach_user_id_fkey(*)`)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []) as any;
    },

    // ── Coach subscriptions (admin only) ───────────────────────
    async listCoachSubscriptions(): Promise<
      Array<CoachSubscription & { coach_display_name: string; coach_email: string }>
    > {
      const { data, error } = await supabase
        .from('coach_subscriptions')
        .select(`
          *,
          coach:profiles!coach_subscriptions_coach_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        coach_display_name: row.coach?.full_name ?? '',
        coach_email: row.coach?.email ?? '',
      }));
    },

    async grantCoachAccess(params: {
      coachUserId: string;
      plan: 'comp' | 'free' | 'coach_pro' | 'coach_pro_annual';
      notes?: string;
    }): Promise<CoachSubscription> {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');

      const status = params.plan === 'comp' ? 'comp' : params.plan === 'free' ? 'free' : 'active';

      const { data, error } = await supabase
        .from('coach_subscriptions')
        .upsert({
          coach_user_id: params.coachUserId,
          plan: params.plan,
          status,
          granted_by: auth.user.id,
          notes: params.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      // Promote profile to 'coach' role
      await supabase
        .from('profiles')
        .update({ role: 'coach' })
        .eq('id', params.coachUserId)
        .eq('role', 'client'); // don't overwrite super_admin

      return data;
    },

    async revokeCoachAccess(coachUserId: string): Promise<void> {
      await supabase
        .from('coach_subscriptions')
        .update({ status: 'canceled' })
        .eq('coach_user_id', coachUserId);
      await supabase
        .from('profiles')
        .update({ role: 'client' })
        .eq('id', coachUserId)
        .eq('role', 'coach');
    },

    // ── Assigned plans ─────────────────────────────────────────
    async assignProgramToClient(
      clientUserId: string,
      programId: string,
      startDate?: string,
      intensityModifier = 1.0
    ): Promise<AssignedPlan> {
      const { data, error } = await supabase.rpc('assign_program_to_client', {
        p_client_user_id: clientUserId,
        p_program_id: programId,
        p_start_date: startDate ?? new Date().toISOString().slice(0, 10),
        p_intensity_modifier: intensityModifier,
      });
      if (error) throw error;
      return data as AssignedPlan;
    },

    async createCustomPlan(
      patch: Partial<AssignedPlan> & {
        client_user_id: string;
        title_fr: string;
        title_en: string;
        title_nl: string;
        goal: string;
        duration_weeks: number;
        start_date: string;
      }
    ): Promise<AssignedPlan> {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('assigned_plans')
        .insert({ ...patch, coach_user_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async listClientPlans(clientUserId: string): Promise<AssignedPlan[]> {
      const { data, error } = await supabase
        .from('assigned_plans')
        .select('*')
        .eq('client_user_id', clientUserId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },

    async getPlanWithSchedule(
      planId: string
    ): Promise<{ plan: AssignedPlan; workouts: AssignedPlanWorkout[]; meals: AssignedPlanMeal | null }> {
      const [planRes, workoutsRes, mealsRes] = await Promise.all([
        supabase.from('assigned_plans').select('*').eq('id', planId).single(),
        supabase
          .from('assigned_plan_workouts')
          .select('*')
          .eq('plan_id', planId)
          .order('week_number')
          .order('day_of_week'),
        supabase
          .from('assigned_plan_meals')
          .select('*')
          .eq('plan_id', planId)
          .maybeSingle(),
      ]);
      if (planRes.error) throw planRes.error;
      if (workoutsRes.error) throw workoutsRes.error;
      if (mealsRes.error) throw mealsRes.error;
      return {
        plan: planRes.data,
        workouts: workoutsRes.data ?? [],
        meals: mealsRes.data,
      };
    },

    async updatePlanStatus(
      planId: string,
      status: AssignedPlan['status']
    ): Promise<AssignedPlan> {
      const { data, error } = await supabase
        .from('assigned_plans')
        .update({ status })
        .eq('id', planId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  };
}

export type CoachManagementClient = ReturnType<typeof createCoachClient>;
