ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_changed boolean NOT NULL DEFAULT true;
