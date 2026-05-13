// =====================================================================
// COACH DM · APP · PHASE 7 — IA COACH ASSISTANT
// supabase/functions/ai-chat/index.ts
// Coeur du système : Anthropic Messages + tool use loop + persistance.
// Déployé via : supabase functions deploy ai-chat
// =====================================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.1';

import {
  buildSystemPrompt,
  buildContextBlock,
  AI_TOOLS,
} from '../_shared/ai-prompts.ts';
import { estimateCostEur, validateAdjustment } from '../_shared/ai-computations.ts';
import type { AIChatRequest, AIChatResponse, AIIntent, Lang } from '../_shared/ai-types.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MODEL = Deno.env.get('AI_MODEL') ?? 'claude-sonnet-4-20250514';
const MAX_TURNS = 6;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = (await req.json()) as AIChatRequest;
    const authHeader = req.headers.get('Authorization')!;
    const userJwt = authHeader.replace('Bearer ', '');

    // Client SUDO pour les opérations admin ; client USER pour RLS check.
    const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const sbUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });

    const { data: { user }, error: userErr } = await sbUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...CORS, 'content-type': 'application/json' } });
    }

    const lang: Lang = body.lang ?? 'fr';
    const intent: AIIntent = body.intent ?? 'general';
    const isCoach = await fetchIsCoachOf(sbAdmin, user.id, body.client_id);
    const coachId = isCoach ? user.id : await fetchCoachOf(sbAdmin, body.client_id);
    if (!coachId) {
      return new Response(JSON.stringify({ error: 'no_coach_found' }), { status: 400, headers: { ...CORS, 'content-type': 'application/json' } });
    }

    // 1. Trouver/créer conversation
    let conversationId = body.conversation_id;
    if (!conversationId) {
      const { data: newConv, error: convErr } = await sbAdmin
        .from('ai_conversations')
        .insert({
          coach_id: coachId,
          client_id: body.client_id,
          intent,
          title_fr: truncateTitle(body.user_message),
          title_en: truncateTitle(body.user_message),
          title_nl: truncateTitle(body.user_message),
        })
        .select()
        .single();
      if (convErr) throw convErr;
      conversationId = newConv.id;
    }

    // 2. Persister message user
    await sbAdmin.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: body.user_message,
      lang,
    });

    // 3. Charger contexte client + historique conversation
    let ctx: any = null;
    if (body.attach_context !== false) {
      const { data: ctxRow } = await sbAdmin
        .from('ai_client_context')
        .select('*')
        .eq('client_id', body.client_id)
        .maybeSingle();
      if (!ctxRow) {
        // Force refresh
        await sbAdmin.rpc('fn_ai_refresh_context', {
          p_client: body.client_id,
          p_coach: coachId,
        });
        const { data: fresh } = await sbAdmin
          .from('ai_client_context')
          .select('*')
          .eq('client_id', body.client_id)
          .maybeSingle();
        ctx = fresh;
      } else {
        ctx = ctxRow;
      }
    }

    const { data: histRows } = await sbAdmin
      .from('ai_messages')
      .select('role, content, tool_name, tool_args, tool_result')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(40);

    const history = (histRows ?? []).map((m: any) => ({
      role: m.role === 'tool' ? 'user' : (m.role as 'user' | 'assistant'),
      content: m.role === 'tool'
        ? [{ type: 'tool_result' as const, tool_use_id: 'replay', content: JSON.stringify(m.tool_result ?? {}) }]
        : m.content,
    })).filter((m: any) => m.role !== 'system');

    const contextBlock = ctx ? buildContextBlock(ctx, lang) : undefined;
    const systemPrompt = buildSystemPrompt(lang, intent, contextBlock);

    // 4. Boucle tool use avec Anthropic
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const messages: any[] = [...history];

    const t0 = Date.now();
    let tokens_in_total = 0;
    let tokens_out_total = 0;
    const tools_used: AIChatResponse['tools_used'] = [];
    const produced: AIChatResponse['produced'] = {};
    let finalText = '';

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        tools: AI_TOOLS as any,
        messages,
      });

      tokens_in_total  += resp.usage?.input_tokens ?? 0;
      tokens_out_total += resp.usage?.output_tokens ?? 0;

      const textParts = resp.content.filter((b: any) => b.type === 'text').map((b: any) => b.text);
      const toolBlocks = resp.content.filter((b: any) => b.type === 'tool_use');

      if (resp.stop_reason === 'end_turn' || toolBlocks.length === 0) {
        finalText = textParts.join('\n').trim();
        messages.push({ role: 'assistant', content: resp.content });
        break;
      }

      // Exécuter chaque tool_use
      messages.push({ role: 'assistant', content: resp.content });
      const toolResults: any[] = [];

      for (const tb of toolBlocks) {
        const toolName = (tb as any).name;
        const toolArgs = (tb as any).input ?? {};
        const toolResult = await runTool(toolName, toolArgs, {
          sb: sbAdmin,
          coachId,
          clientId: body.client_id,
          conversationId,
          lang,
        });

        tools_used.push({ name: toolName, args: toolArgs, result: toolResult });

        // Capture des ressources produites
        if (toolName === 'propose_adjustment' && toolResult?.id) produced.plan_adjustment_id = toolResult.id;
        if (toolName === 'scan_plateau' && toolResult?.detection_id) produced.plateau_detection_id = toolResult.detection_id;
        if (toolName === 'compute_recovery' && toolResult?.id) produced.recovery_reco_id = toolResult.id;
        if (toolName === 'suggest_session' && toolResult?.id) produced.session_suggestion_id = toolResult.id;

        // Persister le tool_use et result en ai_messages
        await sbAdmin.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'tool',
          content: `tool:${toolName}`,
          lang,
          tool_name: toolName,
          tool_args: toolArgs,
          tool_result: toolResult,
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: (tb as any).id,
          content: JSON.stringify(toolResult ?? {}),
        });
      }

      messages.push({ role: 'user', content: toolResults });
    }

    const latency = Date.now() - t0;

    // 5. Persister message assistant final
    if (finalText) {
      await sbAdmin.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: finalText,
        lang,
        tokens_in: tokens_in_total,
        tokens_out: tokens_out_total,
        latency_ms: latency,
        model: MODEL,
      });
    }

    // 6. Usage tracking
    const today = new Date().toISOString().slice(0, 10);
    const cost = estimateCostEur(tokens_in_total, tokens_out_total);
    await sbAdmin.rpc('exec_sql', {}).then(() => {}, () => {}); // noop si non dispo
    await sbAdmin
      .from('ai_usage_daily')
      .upsert(
        {
          coach_id: coachId,
          date: today,
          tokens_in: tokens_in_total,
          tokens_out: tokens_out_total,
          requests: 1,
          cost_eur: cost,
        },
        { onConflict: 'coach_id,date', ignoreDuplicates: false }
      )
      .select()
      .then(async ({ error }) => {
        if (error) {
          // Fallback : increment manuel
          const { data: existing } = await sbAdmin
            .from('ai_usage_daily')
            .select('*')
            .eq('coach_id', coachId)
            .eq('date', today)
            .maybeSingle();
          if (existing) {
            await sbAdmin
              .from('ai_usage_daily')
              .update({
                tokens_in: existing.tokens_in + tokens_in_total,
                tokens_out: existing.tokens_out + tokens_out_total,
                requests: existing.requests + 1,
                cost_eur: existing.cost_eur + cost,
              })
              .eq('coach_id', coachId)
              .eq('date', today);
          }
        }
      });

    const response: AIChatResponse = {
      conversation_id: conversationId!,
      assistant_message: finalText,
      lang,
      tools_used,
      tokens_in: tokens_in_total,
      tokens_out: tokens_out_total,
      latency_ms: latency,
      produced,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('ai-chat error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});

// ---------------------------------------------------------------------
// Tool runner
// ---------------------------------------------------------------------
async function runTool(
  name: string,
  args: any,
  c: { sb: any; coachId: string; clientId: string; conversationId: string; lang: Lang }
): Promise<any> {
  switch (name) {
    case 'get_client_context': {
      if (args.refresh) {
        await c.sb.rpc('fn_ai_refresh_context', {
          p_client: c.clientId,
          p_coach: c.coachId,
        });
      }
      const { data } = await c.sb
        .from('ai_client_context')
        .select('*')
        .eq('client_id', c.clientId)
        .maybeSingle();
      return data ?? { error: 'no_context' };
    }

    case 'scan_plateau': {
      const { data, error } = await c.sb.functions.invoke('ai-plateau-scan', {
        body: {
          client_id: c.clientId,
          metric: args.metric,
          exercise_id: args.exercise_id,
          window_days: args.window_days ?? 28,
        },
      });
      if (error) return { error: String(error) };
      return data ?? {};
    }

    case 'propose_adjustment': {
      const ctx = (await c.sb
        .from('ai_client_context')
        .select('*')
        .eq('client_id', c.clientId)
        .maybeSingle()).data;

      const v = validateAdjustment({
        kind: args.kind,
        ctx,
        evidence: args.evidence ?? {},
        changes: args.changes ?? [],
      });

      if (!v.valid) {
        return { error: 'validation_failed', errors: v.errors, warnings: v.warnings };
      }

      const { data, error } = await c.sb
        .from('ai_plan_adjustments')
        .insert({
          coach_id: c.coachId,
          client_id: c.clientId,
          conversation_id: c.conversationId,
          kind: args.kind,
          reason_fr: args.reason_fr,
          reason_en: args.reason_en,
          reason_nl: args.reason_nl,
          evidence: args.evidence,
          proposed_changes: { changes: args.changes, rationale: args.rationale ?? '' },
          scientific_refs: args.scientific_refs ?? [],
          status: 'proposed',
        })
        .select()
        .single();
      if (error) return { error: String(error) };
      return { id: data.id, status: 'proposed', warnings: v.warnings };
    }

    case 'compute_recovery': {
      const { data, error } = await c.sb.functions.invoke('ai-recovery-reco', {
        body: { client_id: c.clientId, lang: c.lang, date: args.date },
      });
      if (error) return { error: String(error) };
      return data?.reco ?? {};
    }

    case 'suggest_session': {
      const { data, error } = await c.sb.functions.invoke('ai-session-suggest', {
        body: { client_id: c.clientId, lang: c.lang, date: args.date, target_kind: args.target_kind },
      });
      if (error) return { error: String(error) };
      return data?.suggestion ?? {};
    }

    case 'search_history': {
      // Note: vrai RAG nécessite embeddings — fallback ILIKE pour MVP
      const { data } = await c.sb
        .from('ai_embeddings')
        .select('source, content, created_at')
        .eq('client_id', c.clientId)
        .ilike('content', `%${args.query}%`)
        .order('created_at', { ascending: false })
        .limit(args.k ?? 5);
      return { results: data ?? [] };
    }

    default:
      return { error: `unknown_tool:${name}` };
  }
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
async function fetchIsCoachOf(sb: any, userId: string, clientId: string): Promise<boolean> {
  if (userId === clientId) return false;
  const { data } = await sb
    .from('coach_clients')
    .select('id')
    .eq('coach_id', userId)
    .eq('client_id', clientId)
    .eq('is_active', true)
    .maybeSingle();
  return !!data;
}

async function fetchCoachOf(sb: any, clientId: string): Promise<string | null> {
  const { data } = await sb
    .from('coach_clients')
    .select('coach_id')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .maybeSingle();
  return data?.coach_id ?? null;
}

function truncateTitle(s: string): string {
  const t = s.trim().split('\n')[0];
  return t.length > 60 ? t.slice(0, 57) + '...' : t;
}
