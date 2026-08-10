-- Add habits column to entries table
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS habits text[] DEFAULT ARRAY[]::text[];

-- Add comment explaining the column
COMMENT ON COLUMN entries.habits IS 'Array of habit names that were completed for this entry (英语, 健身, iOS编程课)';

-- Update existing entries to have empty habits array
UPDATE entries
SET habits = ARRAY[]::text[]
WHERE habits IS NULL;
