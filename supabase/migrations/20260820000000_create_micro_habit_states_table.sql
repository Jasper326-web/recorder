CREATE TABLE IF NOT EXISTS public.micro_habit_states (
  date_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habits TEXT[] NOT NULL DEFAULT '{}',
  score SMALLINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (date_key, user_id)
);

ALTER TABLE public.micro_habit_states ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'micro_habit_states'
    AND policyname = 'Users can access own micro habit states'
  ) THEN
    CREATE POLICY "Users can access own micro habit states" ON public.micro_habit_states
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_micro_habit_states_user_id ON public.micro_habit_states(user_id);
CREATE INDEX IF NOT EXISTS idx_micro_habit_states_date_key ON public.micro_habit_states(date_key);
