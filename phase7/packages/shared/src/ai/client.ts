// =====================================================================
// COACH DM · APP · PHASE 7 — IA COACH ASSISTANT
// packages/shared/src/ai/client.ts
// Client API typé pour Edge Functions ai-* (utilisé web + mobile).
// =====================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AIChatRequest,
  AIChatResponse,
  AIConversation,
  AIMessage,
  AIClientContext,
  AIPlanAdjustment,
  AIPlateauDetection,
  AIRecoveryReco,
  AISessionSuggestion,
  AIAdjustmentStatus,
  AIUsageDaily,
  Lang,
} from './types';

export class AICoachClient {
  constructor(private readonly sb: SupabaseClient) {}

  // -------------------------------------------------------------------
  // Conversations
  // -------------------------------------------------------------------
  async listConversations(clientId?: string): Promise<AIConversation[]> {
    let q = this.sb
      .from('ai_conversations')
      .select('*')
      .eq('is_archived', false)
      .order('last_msg_at', { ascending: false })
      .limit(50);
    if (clientId) q = q.eq('client_id', clientId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as AIConversation[];
  }

  async getMessages(conversationId: string): Promise<AIMessage[]> {
    const { data, error } = await this.sb
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as AIMessage[];
  }

  async archiveConversation(conversationId: string): Promise<void> {
    const { error } = await this.sb
      .from('ai_conversations')
      .update({ is_archived: true })
      .eq('id', conversationId);
    if (error) throw error;
  }

  // -------------------------------------------------------------------
  // Chat (Edge Function ai-chat)
  // -------------------------------------------------------------------
  async chat(req: AIChatRequest): Promise<AIChatResponse> {
    const { data, error } = await this.sb.functions.invoke('ai-chat', { body: req });
    if (error) throw error;
    return data as AIChatResponse;
  }

  // -------------------------------------------------------------------
  // Context
  // -------------------------------------------------------------------
  async getContext(clientId: string, refresh = false): Promise<AIClientContext | null> {
    if (refresh) {
      const { error } = await this.sb.functions.invoke('ai-context-builder', {
        body: { client_id: clientId },
      });
      if (error) throw error;
    }
    const { data, error } = await this.sb
      .from('ai_client_context')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as AIClientContext | null;
  }

  // -------------------------------------------------------------------
  // Adjustments
  // -------------------------------------------------------------------
  async listAdjustments(filter?: {
    clientId?: string;
    status?: AIAdjustmentStatus;
  }): Promise<AIPlanAdjustment[]> {
    let q = this.sb
      .from('ai_plan_adjustments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filter?.clientId) q = q.eq('client_id', filter.clientId);
    if (filter?.status) q = q.eq('status', filter.status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as AIPlanAdjustment[];
  }

  async updateAdjustmentStatus(
    id: string,
    status: AIAdjustmentStatus,
  ): Promise<AIPlanAdjustment> {
    const patch: Record<string, unknown> = { status };
    if (status === 'applied') {
      patch.applied_at = new Date().toISOString();
    }
    const { data, error } = await this.sb
      .from('ai_plan_adjustments')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AIPlanAdjustment;
  }

  // -------------------------------------------------------------------
  // Plateau
  // -------------------------------------------------------------------
  async listPlateaus(clientId?: string, openOnly = false): Promise<AIPlateauDetection[]> {
    let q = this.sb
      .from('ai_plateau_detections')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(50);
    if (clientId) q = q.eq('client_id', clientId);
    if (openOnly) q = q.is('resolved_at', null);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as AIPlateauDetection[];
  }

  async scanPlateaus(clientId: string): Promise<AIPlateauDetection[]> {
    const { data, error } = await this.sb.functions.invoke('ai-plateau-scan', {
      body: { client_id: clientId },
    });
    if (error) throw error;
    return (data?.detections ?? []) as AIPlateauDetection[];
  }

  async resolvePlateau(id: string, adjustmentId?: string): Promise<void> {
    const { error } = await this.sb
      .from('ai_plateau_detections')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by_adjustment_id: adjustmentId ?? null,
      })
      .eq('id', id);
    if (error) throw error;
  }

  // -------------------------------------------------------------------
  // Recovery
  // -------------------------------------------------------------------
  async getTodayRecovery(clientId: string, lang: Lang = 'fr'): Promise<AIRecoveryReco | null> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await this.sb
      .from('ai_recovery_recos')
      .select('*')
      .eq('client_id', clientId)
      .eq('date', today)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as AIRecoveryReco;

    // Compute on the fly
    const { data: fnData, error: fnErr } = await this.sb.functions.invoke('ai-recovery-reco', {
      body: { client_id: clientId, lang },
    });
    if (fnErr) throw fnErr;
    return (fnData?.reco ?? null) as AIRecoveryReco | null;
  }

  async listRecoveryHistory(clientId: string, days = 30): Promise<AIRecoveryReco[]> {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const { data, error } = await this.sb
      .from('ai_recovery_recos')
      .select('*')
      .eq('client_id', clientId)
      .gte('date', since)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AIRecoveryReco[];
  }

  // -------------------------------------------------------------------
  // Session suggestions
  // -------------------------------------------------------------------
  async getTodaySession(clientId: string, lang: Lang = 'fr'): Promise<AISessionSuggestion | null> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await this.sb
      .from('ai_session_suggestions')
      .select('*')
      .eq('client_id', clientId)
      .eq('date', today)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as AISessionSuggestion;

    const { data: fnData, error: fnErr } = await this.sb.functions.invoke('ai-session-suggest', {
      body: { client_id: clientId, lang },
    });
    if (fnErr) throw fnErr;
    return (fnData?.suggestion ?? null) as AISessionSuggestion | null;
  }

  async acceptSession(id: string): Promise<void> {
    const { error } = await this.sb
      .from('ai_session_suggestions')
      .update({ accepted: true, accepted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  // -------------------------------------------------------------------
  // Usage (admin)
  // -------------------------------------------------------------------
  async getUsageRange(coachId: string, fromDate: string, toDate: string): Promise<AIUsageDaily[]> {
    const { data, error } = await this.sb
      .from('ai_usage_daily')
      .select('*')
      .eq('coach_id', coachId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as AIUsageDaily[];
  }
}
