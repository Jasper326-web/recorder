CREATE TABLE IF NOT EXISTS public.desire_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  trigger TEXT NOT NULL,
  intensity SMALLINT NOT NULL DEFAULT 3,
  coping_strategy TEXT NOT NULL,
  successful BOOLEAN NOT NULL DEFAULT true,
  insight TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.desire_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own desire records" ON public.desire_records
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_desire_records_user_id ON public.desire_records(user_id);
CREATE INDEX IF NOT EXISTS idx_desire_records_date_key ON public.desire_records(date_key);
CREATE INDEX IF NOT EXISTS idx_desire_records_created_at ON public.desire_records(created_at DESC);
