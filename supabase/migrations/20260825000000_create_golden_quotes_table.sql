CREATE TABLE IF NOT EXISTS public.golden_quotes (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE public.golden_quotes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'golden_quotes'
    AND policyname = 'Users can access own golden quotes'
  ) THEN
    CREATE POLICY "Users can access own golden quotes" ON public.golden_quotes
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_golden_quotes_user_id ON public.golden_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_golden_quotes_created_at ON public.golden_quotes(created_at DESC);
