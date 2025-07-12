/*
  # Add entry_type column to journal_entries table

  1. Schema Changes
    - Add `entry_type` column to `journal_entries` table
    - Set default value to 'individual' for existing entries
    - Add NOT NULL constraint

  2. Purpose
    - Distinguish between individual user entries and system-generated daily summaries
    - Enable easy filtering for AI analysis of daily summaries
    - Provide clear categorization for different entry types

  3. Entry Types
    - 'individual': User-created journal entries (default)
    - 'daily_summary': System-generated collective daily transcripts
*/

-- Add entry_type column with default value
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'individual';

-- Update existing entries to have the individual type
UPDATE journal_entries 
SET entry_type = 'individual' 
WHERE entry_type IS NULL;

-- Add NOT NULL constraint after setting defaults
ALTER TABLE journal_entries 
ALTER COLUMN entry_type SET NOT NULL;

-- Add check constraint to ensure only valid entry types
ALTER TABLE journal_entries 
ADD CONSTRAINT check_entry_type 
CHECK (entry_type IN ('individual', 'daily_summary'));

-- Create index for efficient filtering by entry_type
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_type 
ON journal_entries(entry_type);

-- Create composite index for user_id, entry_type, and entry_date
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_type_date 
ON journal_entries(user_id, entry_type, entry_date DESC);