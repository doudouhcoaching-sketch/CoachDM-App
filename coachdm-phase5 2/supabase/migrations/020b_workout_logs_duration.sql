-- =====================================================================
-- Coach DM · Phase 5 · Migration 020b (defensive)
-- Assure que workout_logs.duration_min existe (utilisé par daily_activity)
-- À exécuter AVANT 022_activity_calendar.sql si workout_logs est ancien
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workout_logs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workout_logs'
      AND column_name = 'duration_min'
  ) THEN
    EXECUTE 'ALTER TABLE public.workout_logs ADD COLUMN duration_min int';
    -- Backfill depuis started_at/completed_at si disponibles
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'workout_logs'
        AND column_name = 'completed_at'
    ) THEN
      EXECUTE $bf$
        UPDATE public.workout_logs
        SET duration_min = GREATEST(0, EXTRACT(EPOCH FROM (completed_at - started_at))::int / 60)
        WHERE duration_min IS NULL
          AND completed_at IS NOT NULL
          AND started_at IS NOT NULL
      $bf$;
    END IF;
  END IF;
END$$;
