-- Niveau de regroupement au-dessus des contenus d'une formation :
-- un module rassemble son cours, ses cas et leurs corrections.
CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_modules_course_position_idx
  ON training_modules(course_id, position);

-- NULL = contenu resté à la racine de la formation.
-- Supprimer un module ne supprime pas ses contenus, il les renvoie à la racine.
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES training_modules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS training_sessions_module_position_idx
  ON training_sessions(module_id, position);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON training_modules;
CREATE POLICY "admin_full_access" ON training_modules FOR ALL
  USING (is_admin());

-- Lecture ouverte, calquée sur training_sessions qui l'est déjà en base :
-- c'est ainsi que le portail apprenant lit le contenu d'une formation.
DROP POLICY IF EXISTS "client_read" ON training_modules;
CREATE POLICY "client_read" ON training_modules FOR SELECT
  USING (true);
