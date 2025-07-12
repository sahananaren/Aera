/*
  # Create onboarding responses table

  1. New Tables
    - `onboarding_responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `question_1_responses` (text[], array of selected options for first question)
      - `question_2_responses` (text[], array of selected options for second question)
      - `completed_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `onboarding_responses` table
    - Add policies for users to manage their own responses

  3. Indexes
    - Index on user_id for efficient queries
    - Unique constraint on user_id (one onboarding per user)
*/

CREATE TABLE IF NOT EXISTS onboarding_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  question_1_responses text[] DEFAULT '{}',
  question_2_responses text[] DEFAULT '{}',
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Ensure one onboarding response per user
  UNIQUE(user_id)
);

ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own onboarding responses
CREATE POLICY "Users can read own onboarding responses"
  ON onboarding_responses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy for users to insert their own onboarding responses
CREATE POLICY "Users can insert own onboarding responses"
  ON onboarding_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy for users to update their own onboarding responses
CREATE POLICY "Users can update own onboarding responses"
  ON onboarding_responses
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for efficient queries by user
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_user_id 
  ON onboarding_responses(user_id);