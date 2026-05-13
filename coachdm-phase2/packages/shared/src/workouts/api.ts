// packages/shared/src/workouts/api.ts
// COACH DM — API client pour workouts. Utilise n'importe quel SupabaseClient.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Exercise,
  Program,
  Workout,
  WorkoutExercise,
  WorkoutExerciseFull,
  WorkoutFull,
  WorkoutSession,
  SetLog,
  UserProgramEnrollment,
  WorkoutGoal,
  Locale,
  SessionStatus,
} from './types';

// ===========================================================================
// EXERCISE LIBRARY
// ===========================================================================

export async function listExercises(
  sb: SupabaseClient,
  filters: {
    goal?: WorkoutGoal;
    pattern?: string;
    modality?: string;
    search?: string;
    limit?: number;
  } = {}
): Promise<Exercise[]> {
  let q = sb.from('exercises').select('*').eq('is_active', true);

  if (filters.goal) q = q.contains('goals', [filters.goal]);
  if (filters.pattern) q = q.eq('pattern', filters.pattern);
  if (filters.modality) q = q.eq('modality', filters.modality);
  if (filters.search) {
    // OR across the 3 locales
    q = q.or(
      `name_fr.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,name_nl.ilike.%${filters.search}%`
    );
  }

  q = q.order('name_fr', { ascending: true }).limit(filters.limit ?? 200);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function getExercise(sb: SupabaseClient, slug: string): Promise<Exercise | null> {
  const { data, error } = await sb.from('exercises').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return (data as Exercise) ?? null;
}

// ===========================================================================
// PROGRAMS
// ===========================================================================

export async function listPrograms(
  sb: SupabaseClient,
  filters: { goal?: WorkoutGoal } = {}
): Promise<Program[]> {
  let q = sb.from('programs').select('*');
  if (filters.goal) q = q.eq('goal', filters.goal);
  q = q.order('display_order', { ascending: true });

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Program[];
}

export async function getProgramBySlug(
  sb: SupabaseClient,
  slug: string
): Promise<Program | null> {
  const { data, error } = await sb.from('programs').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return (data as Program) ?? null;
}

// ===========================================================================
// WORKOUTS
// ===========================================================================

export async function getWorkoutFull(
  sb: SupabaseClient,
  workoutId: string
): Promise<WorkoutFull | null> {
  const { data: w, error: ew } = await sb
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .maybeSingle();
  if (ew) throw ew;
  if (!w) return null;

  const { data: wes, error: ewes } = await sb
    .from('workout_exercises')
    .select('*, exercise:exercises(*)')
    .eq('workout_id', workoutId)
    .order('position', { ascending: true });
  if (ewes) throw ewes;

  return { ...(w as Workout), exercises: (wes ?? []) as unknown as WorkoutExerciseFull[] };
}

export async function getProgramWorkouts(
  sb: SupabaseClient,
  programId: string
): Promise<Workout[]> {
  const { data, error } = await sb
    .from('workouts')
    .select('*')
    .eq('program_id', programId)
    .order('week_number', { ascending: true })
    .order('day_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Workout[];
}

export async function getWorkoutForDay(
  sb: SupabaseClient,
  programId: string,
  week: number,
  day: number
): Promise<WorkoutFull | null> {
  const { data, error } = await sb
    .from('workouts')
    .select('id')
    .eq('program_id', programId)
    .eq('week_number', week)
    .eq('day_number', day)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return getWorkoutFull(sb, (data as { id: string }).id);
}

// ===========================================================================
// ENROLLMENTS
// ===========================================================================

export async function getActiveEnrollment(
  sb: SupabaseClient,
  userId: string
): Promise<UserProgramEnrollment | null> {
  const { data, error } = await sb
    .from('user_program_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as UserProgramEnrollment) ?? null;
}

export async function enrollInProgram(
  sb: SupabaseClient,
  userId: string,
  programId: string
): Promise<UserProgramEnrollment> {
  // Deactivate any current active enrollment
  await sb
    .from('user_program_enrollments')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  const { data, error } = await sb
    .from('user_program_enrollments')
    .insert({
      user_id: userId,
      program_id: programId,
      start_date: new Date().toISOString().slice(0, 10),
      current_week: 1,
      current_day: 1,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as UserProgramEnrollment;
}

export async function getTodaysWorkout(
  sb: SupabaseClient,
  userId: string
): Promise<{
  enrollment: UserProgramEnrollment;
  program: Program;
  workout: WorkoutFull;
} | null> {
  const enrollment = await getActiveEnrollment(sb, userId);
  if (!enrollment) return null;

  const { data: program } = await sb
    .from('programs')
    .select('*')
    .eq('id', enrollment.program_id)
    .single();
  if (!program) return null;

  const workout = await getWorkoutForDay(
    sb,
    enrollment.program_id,
    enrollment.current_week,
    enrollment.current_day
  );
  if (!workout) return null;

  return { enrollment, program: program as Program, workout };
}

// ===========================================================================
// SESSION LOGGING
// ===========================================================================

export async function startSession(
  sb: SupabaseClient,
  userId: string,
  workoutId: string,
  enrollmentId: string | null = null
): Promise<WorkoutSession> {
  const { data, error } = await sb
    .from('workout_sessions')
    .insert({
      user_id: userId,
      workout_id: workoutId,
      enrollment_id: enrollmentId,
      status: 'in_progress' satisfies SessionStatus,
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutSession;
}

export async function logSet(
  sb: SupabaseClient,
  sessionId: string,
  payload: Omit<SetLog, 'id' | 'session_id' | 'is_pr'>
): Promise<SetLog> {
  const { data, error } = await sb
    .from('set_logs')
    .insert({ ...payload, session_id: sessionId })
    .select()
    .single();
  if (error) throw error;
  return data as SetLog;
}

export async function endSession(
  sb: SupabaseClient,
  sessionId: string,
  rpe?: number,
  notes?: string
): Promise<WorkoutSession> {
  const { data, error } = await sb
    .from('workout_sessions')
    .update({
      ended_at: new Date().toISOString(),
      status: 'completed' satisfies SessionStatus,
      rpe_overall: rpe ?? null,
      notes: notes ?? null,
    })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutSession;
}

export async function getSessionWithLogs(
  sb: SupabaseClient,
  sessionId: string
): Promise<{ session: WorkoutSession; sets: SetLog[] } | null> {
  const { data: session, error: es } = await sb
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();
  if (es) throw es;
  if (!session) return null;

  const { data: sets, error: el } = await sb
    .from('set_logs')
    .select('*')
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true });
  if (el) throw el;

  return { session: session as WorkoutSession, sets: (sets ?? []) as SetLog[] };
}

export async function getRecentSessions(
  sb: SupabaseClient,
  userId: string,
  limit = 10
): Promise<WorkoutSession[]> {
  const { data, error } = await sb
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkoutSession[];
}

// ===========================================================================
// PERSONAL RECORDS
// ===========================================================================

export async function getUserPRs(
  sb: SupabaseClient,
  userId: string
): Promise<Array<{ exercise: Exercise; best_1rm_kg: number | null; achieved_at: string }>> {
  const { data, error } = await sb
    .from('exercise_personal_records')
    .select('*, exercise:exercises(*)')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    exercise: Exercise;
    best_1rm_kg: number | null;
    achieved_at: string;
  }>;
}
