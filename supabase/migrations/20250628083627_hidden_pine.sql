/*
  # Add prominence_score to insights table

  1. Changes
    - Add `prominence_score` column to `insights` table
    - Set default value to 50 for existing insights
    - Add check constraint to ensure score is between 1-100
    - Update existing insights to have default prominence score

  2. Purpose
    - Track theme importance for 10-theme limit management
    - Enable prominence-based theme replacement
    - Provide visual indicators for theme significance
*/

-- Add prominence_score column to insights table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insights' AND column_name = 'prominence_score'
  ) THEN
    ALTER TABLE insights ADD COLUMN prominence_score integer DEFAULT 50;
  END IF;
END $$;

-- Add check constraint to ensure prominence_score is between 1-100
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_prominence_score' AND table_name = 'insights'
  ) THEN
    ALTER TABLE insights ADD CONSTRAINT check_prominence_score 
    CHECK (prominence_score >= 1 AND prominence_score <= 100);
  END IF;
END $$;

-- Update existing insights to have default prominence score if null
UPDATE insights 
SET prominence_score = 50 
WHERE prominence_score IS NULL;

-- Make prominence_score NOT NULL after setting defaults
ALTER TABLE insights 
ALTER COLUMN prominence_score SET NOT NULL;

-- Add index for efficient ordering by prominence
CREATE INDEX IF NOT EXISTS idx_insights_prominence 
  ON insights(user_id, prominence_score DESC);