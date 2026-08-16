-- Remove abstinence_status column from daily_states (feature removed, keeping only habits)
ALTER TABLE public.daily_states DROP COLUMN IF EXISTS abstinence_status;
