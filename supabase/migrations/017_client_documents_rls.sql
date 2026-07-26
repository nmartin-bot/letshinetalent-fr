-- Permet aux clients d'uploader leurs propres documents
-- (entity_type et entity_id doivent correspondre à leur profil)
CREATE POLICY "client_insert_own_documents"
  ON documents FOR INSERT
  WITH CHECK (
    entity_id IN (
      SELECT entity_id FROM profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );

-- Permet aux clients de lire leurs propres documents
CREATE POLICY "client_read_own_documents"
  ON documents FOR SELECT
  USING (
    entity_id IN (
      SELECT entity_id FROM profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );

-- Dossier global "Documents du client" (pré-créé, les clients n'ont pas besoin d'insérer dans document_folders)
INSERT INTO document_folders (name, parent_id, entity_type, entity_id)
VALUES ('Documents du client', NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Permet aux clients de lire les dossiers (pour naviguer dans DocumentManager)
CREATE POLICY "client_read_folders"
  ON document_folders FOR SELECT
  USING (true);
