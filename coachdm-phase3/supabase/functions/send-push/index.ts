// supabase/functions/send-push/index.ts
// ============================================================
// Coach DM · Edge Function · Expo Push Notifications
// ============================================================
// Triggered by Postgres triggers on new messages and check-ins.
// Reads device tokens from `profiles.expo_push_token` column.
// Deploy: supabase functions deploy send-push --no-verify-jwt
// ============================================================

// deno-lint-ignore-file no-explicit-any

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload: PushPayload = await req.json();
    if (!payload.user_id || !payload.title || !payload.body) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Look up the user's Expo push token
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('expo_push_token, locale, push_enabled')
      .eq('id', payload.user_id)
      .maybeSingle();

    if (error) throw error;
    if (!profile?.expo_push_token || profile.push_enabled === false) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_token_or_disabled' }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    // Send via Expo Push Service
    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        priority: 'high',
        channelId: 'coach-dm',
      }),
    });

    const expoData = await expoRes.json();
    return new Response(JSON.stringify(expoData), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[send-push] error', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
