/*
  # Create summaries table for AI-generated daily analysis

  1. New Tables
    - `summaries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `summary_date` (date, the date this summary covers)
      - `content` (text, the AI-generated summary)
      - `emotions` (jsonb, array of detected emotions with quotes)
      - `sections` (jsonb, structured sections like achievements, memories, etc.)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `summaries` table
    - Add policies for users to manage their own summaries

  3. Indexes
    - Index on user_id and summary_date for efficient queries
    - Unique constraint on user_id + summary_date (one summary per user per day)
*/

CREATE TABLE IF NOT EXISTS summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  summary_date date NOT NULL,
  content text NOT NULL,
  emotions jsonb DEFAULT '[]'::jsonb,
  sections jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one summary per user per day
  UNIQUE(user_id, summary_date)
);

ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own summaries
CREATE POLICY "Users can read own summaries"
  ON summaries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy for users to insert their own summaries
CREATE POLICY "Users can insert own summaries"
  ON summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy for users to update their own summaries
CREATE POLICY "Users can update own summaries"
  ON summaries
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy for users to delete their own summaries
CREATE POLICY "Users can delete own summaries"
  ON summaries
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for efficient queries by user and date
CREATE INDEX IF NOT EXISTS idx_summaries_user_date 
  ON summaries(user_id, summary_date DESC);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_summaries_updated_at
  BEFORE UPDATE ON summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();