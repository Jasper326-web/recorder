-- Create daily_states table for independent daily status tracking
CREATE TABLE IF NOT EXISTS public.daily_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  abstinence_status TEXT,
  habits TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(date_key, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.daily_states ENABLE ROW LEVEL SECURITY;

-- Policy: users can only access their own daily states
CREATE POLICY "Users can access own daily states" ON public.daily_states
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_daily_states_user_id ON public.daily_states(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_states_date_key ON public.daily_states(date_key);
