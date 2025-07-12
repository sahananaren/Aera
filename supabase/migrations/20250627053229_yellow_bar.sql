/*
  # Create monthly summaries table

  1. New Tables
    - `monthly_summaries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `month` (text, month name like "January")
      - `year` (integer, year like 2024)
      - `dimension` (text, dimension name or "Overall")
      - `summary` (text, the AI-generated summary)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `monthly_summaries` table
    - Add policies for users to manage their own summaries

  3. Indexes
    - Index on user_id, year, and month for efficient queries
    - Unique constraint on user_id, year, month, dimension
*/

CREATE TABLE IF NOT EXISTS monthly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  month text NOT NULL,
  year integer NOT NULL,
  dimension text NOT NULL,
  summary text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one summary per user per month per dimension
  UNIQUE(user_id, year, month, dimension)
);

ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own monthly summaries
CREATE POLICY "Users can read own monthly summaries"
  ON monthly_summaries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy for users to insert their own monthly summaries
CREATE POLICY "Users can insert own monthly summaries"
  ON monthly_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy for users to update their own monthly summaries
CREATE POLICY "Users can update own monthly summaries"
  ON monthly_summaries
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy for users to delete their own monthly summaries
CREATE POLICY "Users can delete own monthly summaries"
  ON monthly_summaries
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for efficient queries by user, year, and month
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_user_year_month 
  ON monthly_summaries(user_id, year DESC, month);

-- Index for efficient filtering by dimension
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_dimension 
  ON monthly_summaries(dimension);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_monthly_summaries_updated_at
  BEFORE UPDATE ON monthly_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();