-- Visibilité d'un document promo par promo.
-- Une ligne = ce document est MASQUÉ pour ce groupe. Absence de ligne = visible
-- par tous : les documents existants et les nouvelles promos gardent donc le
-- comportement actuel sans reprise de données.
CREATE TABLE IF NOT EXISTS document_hidden_groups (
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES learner_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, group_id)
);

CREATE INDEX IF NOT EXISTS document_hidden_groups_group_idx
  ON document_hidden_groups(group_id);

ALTER TABLE document_hidden_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON document_hidden_groups;
CREATE POLICY "admin_full_access" ON document_hidden_groups FOR ALL
  USING (is_admin());

-- Le portail lit cette table pour écarter les documents masqués de sa promo.
DROP POLICY IF EXISTS "client_read" ON document_hidden_groups;
CREATE POLICY "client_read" ON document_hidden_groups FOR SELECT
  USING (true);
