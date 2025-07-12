/*
  # Create insights table for recurring theme analysis

  1. New Tables
    - `insights`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `title` (text, theme title)
      - `summary` (text, theme description)
      - `quotes` (text[], array of journal excerpts)
      - `last_updated` (timestamp, when this theme was last updated)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `insights` table
    - Add policies for users to manage their own insights

  3. Indexes
    - Index on user_id for efficient queries
    - Index on last_updated for checking update needs
*/

CREATE TABLE IF NOT EXISTS insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  quotes text[] DEFAULT '{}',
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own insights
CREATE POLICY "Users can read own insights"
  ON insights
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy for users to insert their own insights
CREATE POLICY "Users can insert own insights"
  ON insights
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy for users to update their own insights
CREATE POLICY "Users can update own insights"
  ON insights
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy for users to delete their own insights
CREATE POLICY "Users can delete own insights"
  ON insights
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for efficient queries by user
CREATE INDEX IF NOT EXISTS idx_insights_user_id 
  ON insights(user_id);

-- Index for checking update needs
CREATE INDEX IF NOT EXISTS idx_insights_last_updated 
  ON insights(user_id, last_updated DESC);