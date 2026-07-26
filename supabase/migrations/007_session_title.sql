-- Add title to training_sessions, make session_date optional
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE training_sessions ALTER COLUMN session_date DROP NOT NULL;
