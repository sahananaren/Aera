/*
  # Add photos column to journal entries

  1. Changes
    - Add `photos` column to `journal_entries` table to store array of photo URLs
    - Set default value to empty array
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed as photos are part of journal entries
*/

-- Add photos column to journal_entries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'photos'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN photos text[] DEFAULT '{}';
  END IF;
END $$;

-- Add index for photos column
CREATE INDEX IF NOT EXISTS idx_journal_entries_photos ON journal_entries USING gin(photos);