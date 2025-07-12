/*
  # Create dimension summaries table for structured AI analysis

  1. New Tables
    - `dimension_summaries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `summary_date` (date, the date of the original journal entries)
      - `dimension` (text, one of: Achievement, Introspection, Memories, Little Things, Connections, Major life event)
      - `entry` (text, the AI-generated summary for that dimension)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `dimension_summaries` table
    - Add policies for users to manage their own dimension summaries

  3. Indexes
    - Index on user_id and summary_date for efficient queries
    - Index on dimension for filtering
*/

CREATE TABLE IF NOT EXISTS dimension_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  summary_date date NOT NULL,
  dimension text NOT NULL,
  entry text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one entry per user per date per dimension
  UNIQUE(user_id, summary_date, dimension)
);

ALTER TABLE dimension_summaries ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own dimension summaries
CREATE POLICY "Users can read own dimension summaries"
  ON dimension_summaries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy for users to insert their own dimension summaries
CREATE POLICY "Users can insert own dimension summaries"
  ON dimension_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy for users to update their own dimension summaries
CREATE POLICY "Users can update own dimension summaries"
  ON dimension_summaries
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy for users to delete their own dimension summaries
CREATE POLICY "Users can delete own dimension summaries"
  ON dimension_summaries
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add check constraint to ensure only valid dimensions
ALTER TABLE dimension_summaries 
ADD CONSTRAINT check_dimension_type 
CHECK (dimension IN ('Achievement', 'Introspection', 'Memories', 'Little Things', 'Connections', 'Major life event'));

-- Index for efficient queries by user and date
CREATE INDEX IF NOT EXISTS idx_dimension_summaries_user_date 
  ON dimension_summaries(user_id, summary_date DESC);

-- Index for efficient filtering by dimension
CREATE INDEX IF NOT EXISTS idx_dimension_summaries_dimension 
  ON dimension_summaries(dimension);

-- Composite index for user, date, and dimension
CREATE INDEX IF NOT EXISTS idx_dimension_summaries_user_date_dimension 
  ON dimension_summaries(user_id, summary_date, dimension);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_dimension_summaries_updated_at
  BEFORE UPDATE ON dimension_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();