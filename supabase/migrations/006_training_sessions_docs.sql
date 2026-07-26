-- Allow documents linked to a specific training session
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_entity_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_entity_type_check
  CHECK (entity_type IN ('company', 'candidate', 'learner', 'course', 'session'));

-- Direct formation enrollment on learner & candidate
ALTER TABLE learners ADD COLUMN IF NOT EXISTS training_course_id uuid REFERENCES training_courses(id) ON DELETE SET NULL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS training_course_id uuid REFERENCES training_courses(id) ON DELETE SET NULL;
