// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Edge Function : recovery-reminders
// ═══════════════════════════════════════════════════════════════════════════
// Déclenché par pg_cron toutes les 30 min.
// Pour chaque user :
//   1) Calcule l'heure locale (timezone du user)
//   2) Détermine si un rappel doit être envoyé (sommeil / hydratation / habit)
//   3) Envoie via Expo Push API en FR / EN / NL
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type Lang = 'fr' | 'en' | 'nl';

interface ReminderMsg {
  fr: { title: string; body: string };
  en: { title: string; body: string };
  nl: { title: string; body: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages trilingues
// ─────────────────────────────────────────────────────────────────────────────
const MSG = {
  hydration_morning: {
    fr: { title: '💧 Première gorgée', body: 'Hydrate-toi maintenant pour bien commencer la journée.' },
    en: { title: '💧 First sip',         body: 'Hydrate now to start the day right.' },
    nl: { title: '💧 Eerste slok',       body: 'Drink nu om de dag goed te beginnen.' },
  } satisfies ReminderMsg,
  hydration_recurring: (remainingMl: number) => ({
    fr: { title: '💧 Hydratation', body: `Encore ${remainingMl} ml pour atteindre ton objectif.` },
    en: { title: '💧 Hydration',   body: `${remainingMl} ml left to hit your goal.` },
    nl: { title: '💧 Hydratatie',  body: `Nog ${remainingMl} ml tot je doel.` },
  } satisfies ReminderMsg),
  hydration_target_met: {
    fr: { title: '✅ Objectif atteint', body: 'Excellent. Continue sur ce rythme.' },
    en: { title: '✅ Goal reached',     body: 'Great work. Keep that pace.' },
    nl: { title: '✅ Doel bereikt',     body: 'Uitstekend. Hou dit ritme aan.' },
  } satisfies ReminderMsg,
  sleep_bedtime: {
    fr: { title: '🌙 Heure du coucher', body: 'Vise 7-9h de sommeil. Coupe les écrans 30 min avant.' },
    en: { title: '🌙 Bedtime',          body: 'Aim for 7-9h sleep. Cut screens 30 min before.' },
    nl: { title: '🌙 Bedtijd',          body: 'Mik op 7-9u slaap. Geen schermen 30 min van tevoren.' },
  } satisfies ReminderMsg,
  sleep_log: {
    fr: { title: '🌙 Comment as-tu dormi ?', body: "Note ta nuit en 10 secondes." },
    en: { title: '🌙 How did you sleep?',    body: 'Log your night in 10 seconds.' },
    nl: { title: '🌙 Hoe heb je geslapen?',  body: 'Log je nacht in 10 seconden.' },
  } satisfies ReminderMsg,
  habit_reminder: (habitName: string) => ({
    fr: { title: '⚡ Rappel', body: `C'est l'heure : ${habitName}.` },
    en: { title: '⚡ Reminder', body: `Time for: ${habitName}.` },
    nl: { title: '⚡ Herinnering', body: `Tijd voor: ${habitName}.` },
  } satisfies ReminderMsg),
};

// Libellés des catégories d'habit (pour afficher dans le rappel)
const HABIT_LABELS: Record<string, ReminderMsg> = {
  meditation: {
    fr: { title: 'Méditation', body: '' },
    en: { title: 'Meditation', body: '' },
    nl: { title: 'Meditatie', body: '' },
  },
  stretching: {
    fr: { title: 'Étirements', body: '' },
    en: { title: 'Stretching', body: '' },
    nl: { title: 'Rekken', body: '' },
  },
  mobility: {
    fr: { title: 'Mobilité', body: '' },
    en: { title: 'Mobility', body: '' },
    nl: { title: 'Mobiliteit', body: '' },
  },
  journaling: {
    fr: { title: 'Journaling', body: '' },
    en: { title: 'Journaling', body: '' },
    nl: { title: 'Dagboek', body: '' },
  },
  breathwork: {
    fr: { title: 'Respiration', body: '' },
    en: { title: 'Breathwork', body: '' },
    nl: { title: 'Ademhaling', body: '' },
  },
  cold_exposure: {
    fr: { title: 'Exposition au froid', body: '' },
    en: { title: 'Cold exposure', body: '' },
    nl: { title: 'Koude blootstelling', body: '' },
  },
  sauna: {
    fr: { title: 'Sauna', body: '' },
    en: { title: 'Sauna', body: '' },
    nl: { title: 'Sauna', body: '' },
  },
  reading: {
    fr: { title: 'Lecture', body: '' },
    en: { title: 'Reading', body: '' },
    nl: { title: 'Lezen', body: '' },
  },
  walking: {
    fr: { title: 'Marche', body: '' },
    en: { title: 'Walking', body: '' },
    nl: { title: 'Wandelen', body: '' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Heure locale (HH:mm) d'un user dans sa timezone */
function localTime(tz: string): { hour: number; minute: number; date: string } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: '2-digit', minute: '2-digit', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/** Fenêtre de tolérance ±15 min pour un rappel à HH:mm */
function timeMatches(targetH: number, targetM: number, nowH: number, nowM: number): boolean {
  const target = targetH * 60 + targetM;
  const now = nowH * 60 + nowM;
  return Math.abs(target - now) <= 15;
}

/** HH:mm:ss → {h, m} */
function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(':');
  return { h: parseInt(h, 10), m: parseInt(m, 10) };
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data?: Record<string, unknown>;
  channelId?: string;
}

async function sendExpoBatch(messages: ExpoMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Expo accepte jusqu'à 100 messages par requête
  const chunks: ExpoMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        console.error('Expo push failed', res.status, await res.text());
      }
    } catch (e) {
      console.error('Expo push error', e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // 1) Tous les users avec push token + timezone + langue
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, expo_push_token, language, hydration_targets(*), recovery_streaks(*)')
    .not('expo_push_token', 'is', null);

  if (error) {
    console.error('Failed to fetch profiles', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const messagesToSend: ExpoMessage[] = [];

  for (const profile of profiles || []) {
    const lang: Lang = (profile.language as Lang) || 'fr';
    const pushToken = profile.expo_push_token;
    if (!pushToken) continue;

    const target = (profile.hydration_targets as any)?.[0] ?? profile.hydration_targets;
    const tz = target?.timezone || 'Europe/Brussels';
    const now = localTime(tz);

    // ─── A) Rappel hydratation ──────────────────────────────────────────────
    if (target && target.reminder_enabled) {
      const start = parseTime(target.reminder_start);
      const end = parseTime(target.reminder_end);
      const startMin = start.h * 60 + start.m;
      const endMin = end.h * 60 + end.m;
      const nowMin = now.hour * 60 + now.minute;

      if (nowMin >= startMin && nowMin <= endMin) {
        // Aligné sur l'intervalle ?
        const sinceStart = nowMin - startMin;
        const onInterval = sinceStart % target.reminder_interval_min < 30;

        if (onInterval) {
          // Vérifier le total bu aujourd'hui
          const { data: daily } = await supabase
            .from('hydration_daily')
            .select('total_ml')
            .eq('user_id', profile.id)
            .eq('drank_date', now.date)
            .maybeSingle();

          const totalMl = (daily?.total_ml as number | null) ?? 0;
          const targetMl = target.target_ml as number;
          const remaining = Math.max(0, targetMl - totalMl);

          let msg: { title: string; body: string };
          if (totalMl === 0 && nowMin <= startMin + 30) {
            msg = MSG.hydration_morning[lang];
          } else if (remaining === 0) {
            // Atteint : on n'envoie qu'une fois (heuristique = 1er rappel après atteinte)
            const { data: lastEntry } = await supabase
              .from('hydration_entries')
              .select('drank_at')
              .eq('user_id', profile.id)
              .eq('drank_date', now.date)
              .order('drank_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            // On envoie uniquement si la dernière entrée est dans les 30 dernières min
            if (lastEntry) {
              const last = new Date(lastEntry.drank_at as string);
              if (Date.now() - last.getTime() < 30 * 60 * 1000) {
                msg = MSG.hydration_target_met[lang];
              } else continue;
            } else continue;
          } else {
            msg = MSG.hydration_recurring(remaining)[lang];
          }

          messagesToSend.push({
            to: pushToken,
            title: msg.title,
            body: msg.body,
            sound: 'default',
            data: { type: 'hydration', date: now.date },
            channelId: 'recovery',
          });
        }
      }
    }

    // ─── B) Rappel coucher (21:30 par défaut, configurable plus tard) ───────
    if (timeMatches(21, 30, now.hour, now.minute)) {
      const msg = MSG.sleep_bedtime[lang];
      messagesToSend.push({
        to: pushToken,
        title: msg.title,
        body: msg.body,
        sound: 'default',
        data: { type: 'sleep_bedtime', date: now.date },
        channelId: 'recovery',
      });
    }

    // ─── C) Rappel "logger sa nuit" (08:00) ─────────────────────────────────
    if (timeMatches(8, 0, now.hour, now.minute)) {
      const { data: existing } = await supabase
        .from('sleep_sessions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('sleep_date', now.date)
        .maybeSingle();

      if (!existing) {
        const msg = MSG.sleep_log[lang];
        messagesToSend.push({
          to: pushToken,
          title: msg.title,
          body: msg.body,
          sound: 'default',
          data: { type: 'sleep_log', date: now.date },
          channelId: 'recovery',
        });
      }
    }

    // ─── D) Rappels habits ──────────────────────────────────────────────────
    const { data: habits } = await supabase
      .from('habits')
      .select('id, name, category, reminder_time, reminder_enabled, active_days, target_minutes')
      .eq('user_id', profile.id)
      .eq('reminder_enabled', true)
      .eq('archived', false);

    for (const habit of habits || []) {
      if (!habit.reminder_time) continue;

      // Jour actif ?
      const dow = (() => {
        // Convert Date to ISO weekday in user's timezone (1=Mon..7=Sun)
        const d = new Date();
        const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
        const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
        return map[fmt.format(d)] ?? 1;
      })();
      if (!habit.active_days?.includes(dow)) continue;

      const t = parseTime(habit.reminder_time as string);
      if (!timeMatches(t.h, t.m, now.hour, now.minute)) continue;

      // Pas déjà fait aujourd'hui ?
      const { data: log } = await supabase
        .from('habit_logs')
        .select('id')
        .eq('habit_id', habit.id)
        .eq('log_date', now.date)
        .maybeSingle();
      if (log) continue;

      const habitName =
        habit.category === 'custom'
          ? (habit.name as string)
          : HABIT_LABELS[habit.category as string]?.[lang]?.title || (habit.name as string) || '—';

      const msg = MSG.habit_reminder(habitName)[lang];
      messagesToSend.push({
        to: pushToken,
        title: msg.title,
        body: msg.body,
        sound: 'default',
        data: { type: 'habit', habit_id: habit.id },
        channelId: 'recovery',
      });
    }
  }

  await sendExpoBatch(messagesToSend);

  return new Response(JSON.stringify({ sent: messagesToSend.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
