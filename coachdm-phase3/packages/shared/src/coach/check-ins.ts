// ============================================================
// Coach DM · Shared · Check-ins client (Supabase)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CheckIn,
  CheckInPhoto,
  CheckInWithPhotos,
  CheckInSchedule,
} from './types';

export function createCheckInsClient(supabase: SupabaseClient) {
  return {
    /**
     * Returns the current pending check-in for the logged-in client,
     * or the most recent if none pending.
     */
    async getCurrentForClient(): Promise<CheckInWithPhotos | null> {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;

      const { data, error } = await supabase
        .from('check_ins')
        .select('*, photos:check_in_photos(*)')
        .eq('client_user_id', auth.user.id)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CheckInWithPhotos | null;
    },

    async getHistoryForClient(clientUserId: string): Promise<CheckInWithPhotos[]> {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*, photos:check_in_photos(*)')
        .eq('client_user_id', clientUserId)
        .order('week_start_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CheckInWithPhotos[];
    },

    /**
     * Coach view: list pending check-ins across all clients.
     */
    async listPendingForCoach(): Promise<CheckInWithPhotos[]> {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*, photos:check_in_photos(*)')
        .in('status', ['submitted'])
        .order('submitted_at', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as CheckInWithPhotos[];
    },

    async updateMetrics(
      checkInId: string,
      patch: Partial<CheckIn>
    ): Promise<CheckIn> {
      const { data, error } = await supabase
        .from('check_ins')
        .update(patch)
        .eq('id', checkInId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async submit(checkInId: string): Promise<CheckIn> {
      const { data, error } = await supabase.rpc('submit_check_in', {
        p_check_in_id: checkInId,
      });
      if (error) throw error;
      return data as CheckIn;
    },

    async coachReview(
      checkInId: string,
      feedback: string,
      actionItems: string
    ): Promise<CheckIn> {
      const { data, error } = await supabase
        .from('check_ins')
        .update({
          status: 'reviewed',
          coach_feedback: feedback,
          coach_action_items: actionItems,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', checkInId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async uploadPhoto(
      checkInId: string,
      file: Blob,
      pose: 'front' | 'side' | 'back' | 'other',
      filename: string,
      userId: string
    ): Promise<CheckInPhoto> {
      const path = `${userId}/${checkInId}/${Date.now()}-${pose}-${filename}`;

      const { error: upErr } = await supabase.storage
        .from('check-in-photos')
        .upload(path, file);
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from('check_in_photos')
        .insert({
          check_in_id: checkInId,
          storage_path: path,
          pose,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async getPhotoUrl(storagePath: string): Promise<string> {
      const { data, error } = await supabase.storage
        .from('check-in-photos')
        .createSignedUrl(storagePath, 3600);
      if (error) throw error;
      return data.signedUrl;
    },

    async getSchedule(clientUserId: string): Promise<CheckInSchedule | null> {
      const { data, error } = await supabase
        .from('check_in_schedules')
        .select('*')
        .eq('client_user_id', clientUserId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async updateSchedule(
      scheduleId: string,
      patch: Partial<CheckInSchedule>
    ): Promise<CheckInSchedule> {
      const { data, error } = await supabase
        .from('check_in_schedules')
        .update(patch)
        .eq('id', scheduleId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  };
}

export type CheckInsClient = ReturnType<typeof createCheckInsClient>;
