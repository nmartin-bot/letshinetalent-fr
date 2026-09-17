-- Allow shared documents (audience = global / all candidates / all learners)
-- entity_id can be NULL when a document is not tied to a specific person
ALTER TABLE documents ALTER COLUMN entity_id DROP NOT NULL;
