-- Attribution des formations.
-- Remplace le lien unique learners.training_course_id : une formation peut être
-- donnée à une personne précise (candidat ou apprenant), à une promo, ou à toute
-- une catégorie. Une personne peut donc suivre plusieurs formations.
CREATE TABLE IF NOT EXISTS course_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  subject_type text NOT NULL CHECK (subject_type IN ('candidate', 'learner', 'group', 'all_candidates', 'all_learners')),
  -- NULL pour les attributions larges (all_candidates / all_learners)
  subject_id uuid,
  -- Curseur d'accès propre à cette attribution : une personne inscrite à deux
  -- formations progresse dans chacune indépendamment.
  current_session_id uuid REFERENCES training_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- NULL n'étant pas égal à NULL en SQL, il faut deux index pour couvrir
-- les attributions nominatives et les attributions larges.
CREATE UNIQUE INDEX IF NOT EXISTS course_access_subject_uq
  ON course_access(course_id, subject_type, subject_id) WHERE subject_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS course_access_wildcard_uq
  ON course_access(course_id, subject_type) WHERE subject_id IS NULL;
CREATE INDEX IF NOT EXISTS course_access_course_idx ON course_access(course_id);
CREATE INDEX IF NOT EXISTS course_access_subject_idx ON course_access(subject_type, subject_id);

-- Reprise de l'existant : chaque apprenant garde sa formation et son curseur.
INSERT INTO course_access (course_id, subject_type, subject_id, current_session_id)
SELECT l.training_course_id, 'learner', l.id, l.current_session_id
FROM learners l
WHERE l.training_course_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Chaque promo garde le sien.
INSERT INTO course_access (course_id, subject_type, subject_id, current_session_id)
SELECT g.course_id, 'group', g.id, g.current_session_id
FROM learner_groups g
ON CONFLICT DO NOTHING;

ALTER TABLE course_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON course_access;
CREATE POLICY "admin_full_access" ON course_access FOR ALL
  USING (is_admin());

-- Lecture ouverte, calquée sur training_sessions et training_modules :
-- le portail en a besoin pour savoir à quoi la personne connectée a droit.
DROP POLICY IF EXISTS "client_read" ON course_access;
CREATE POLICY "client_read" ON course_access FOR SELECT
  USING (true);
