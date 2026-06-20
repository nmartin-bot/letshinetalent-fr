-- Lien entreprise mandataire → candidat
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_start_date date,
  ADD COLUMN IF NOT EXISTS program_notes text;
