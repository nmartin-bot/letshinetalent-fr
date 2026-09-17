-- Groupes d'apprenants : une formation peut être dispensée à plusieurs promos,
-- chacune avec ses propres participants et ses propres dates.
-- current_session_id est le curseur d'accès de la promo : il est recopié sur
-- chaque membre, le portail apprenant continuant de lire learners.current_session_id.
CREATE TABLE IF NOT EXISTS learner_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  starts_on date,
  ends_on date,
  current_session_id uuid REFERENCES training_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE learner_groups ADD COLUMN IF NOT EXISTS current_session_id uuid REFERENCES training_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS learner_groups_course_id_idx ON learner_groups(course_id);

ALTER TABLE learners ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES learner_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS learners_group_id_idx ON learners(group_id);

ALTER TABLE learner_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON learner_groups;
CREATE POLICY "admin_full_access" ON learner_groups FOR ALL
  USING (is_admin());
