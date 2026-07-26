-- Supprimer le doublon CV (garder le plus ancien)
DELETE FROM document_folders
WHERE name = 'CV'
  AND entity_id IS NULL
  AND id NOT IN (
    SELECT id FROM document_folders
    WHERE name = 'CV' AND entity_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1
  );

-- Créer les sous-dossiers natifs sous CV
INSERT INTO document_folders (name, parent_id, entity_type, entity_id)
SELECT 'Candidats', id, NULL, NULL
FROM document_folders
WHERE name = 'CV' AND entity_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO document_folders (name, parent_id, entity_type, entity_id)
SELECT 'Apprenants', id, NULL, NULL
FROM document_folders
WHERE name = 'CV' AND entity_id IS NULL
ON CONFLICT DO NOTHING;

-- Créer les sous-dossiers natifs sous Lettre de motivation
INSERT INTO document_folders (name, parent_id, entity_type, entity_id)
SELECT 'Candidats', id, NULL, NULL
FROM document_folders
WHERE name = 'Lettre de motivation' AND entity_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO document_folders (name, parent_id, entity_type, entity_id)
SELECT 'Apprenants', id, NULL, NULL
FROM document_folders
WHERE name = 'Lettre de motivation' AND entity_id IS NULL
ON CONFLICT DO NOTHING;
