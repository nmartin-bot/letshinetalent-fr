-- Ordre explicite des modules d'une formation.
-- Jusqu'ici l'ordre venait de created_at : insérer un module au milieu
-- obligeait à supprimer puis recréer tous les suivants.
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS position int;

UPDATE training_sessions s
SET position = r.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY course_id ORDER BY created_at, id) - 1 AS rn
  FROM training_sessions
) r
WHERE s.id = r.id AND s.position IS NULL;

CREATE INDEX IF NOT EXISTS training_sessions_course_position_idx
  ON training_sessions(course_id, position);
