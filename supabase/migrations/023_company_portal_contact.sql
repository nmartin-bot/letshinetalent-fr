ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS portal_first_name text,
  ADD COLUMN IF NOT EXISTS portal_last_name text,
  ADD COLUMN IF NOT EXISTS portal_email text;
