-- Document folders
CREATE TABLE document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES document_folders(id) ON DELETE CASCADE,
  entity_type text CHECK (entity_type IN ('company', 'candidate', 'learner', 'course')),
  entity_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_document_folders_parent ON document_folders (parent_id);
CREATE INDEX idx_document_folders_entity ON document_folders (entity_type, entity_id);

-- Add folder_id to documents
ALTER TABLE documents ADD COLUMN folder_id uuid REFERENCES document_folders(id) ON DELETE SET NULL;
CREATE INDEX idx_documents_folder ON documents (folder_id);

-- Update category check to match new labels from Cordelle
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;
ALTER TABLE documents ADD CONSTRAINT documents_category_check
  CHECK (category IN ('cv', 'lettre_motivation', 'synthese', 'rapport', 'contrat', 'autre', 'lettre', 'convention', 'cr', 'support', 'attestation'));
