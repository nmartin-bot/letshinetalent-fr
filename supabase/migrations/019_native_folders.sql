-- Dossiers natifs non supprimables pour les documents des candidatures
INSERT INTO document_folders (name, parent_id, entity_type, entity_id)
VALUES
  ('CV', NULL, NULL, NULL),
  ('Lettre de motivation', NULL, NULL, NULL)
ON CONFLICT DO NOTHING;
