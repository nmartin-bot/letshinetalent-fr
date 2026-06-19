-- ============================================================
-- Migration 002 — Row Level Security (RLS)
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "admin_full_access" ON profiles FOR ALL
  USING (is_admin());

CREATE POLICY "client_own_profile" ON profiles FOR SELECT
  USING (id = auth.uid());

-- ============================================================
-- COMPANIES — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON companies FOR ALL
  USING (is_admin());

-- ============================================================
-- CONTACTS — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON contacts FOR ALL
  USING (is_admin());

-- ============================================================
-- CANDIDATES — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON candidates FOR ALL
  USING (is_admin());

-- ============================================================
-- LEARNERS — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON learners FOR ALL
  USING (is_admin());

-- ============================================================
-- INTERACTIONS — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON interactions FOR ALL
  USING (is_admin());

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE POLICY "admin_full_access" ON appointments FOR ALL
  USING (is_admin());

CREATE POLICY "client_own_appointments" ON appointments FOR SELECT
  USING (
    entity_id = (
      SELECT entity_id FROM profiles WHERE id = auth.uid() AND role = 'client'
    )
  );

-- ============================================================
-- COACHING SESSIONS — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON coaching_sessions FOR ALL
  USING (is_admin());

-- ============================================================
-- CV VERSIONS — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON cv_versions FOR ALL
  USING (is_admin());

-- ============================================================
-- TRAINING COURSES — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON training_courses FOR ALL
  USING (is_admin());

-- ============================================================
-- TRAINING SESSIONS — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON training_sessions FOR ALL
  USING (is_admin());

-- ============================================================
-- ATTENDANCE — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON attendance FOR ALL
  USING (is_admin());

-- ============================================================
-- EVALUATIONS — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON evaluations FOR ALL
  USING (is_admin());

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE POLICY "admin_full_access" ON documents FOR ALL
  USING (is_admin());

CREATE POLICY "client_own_documents" ON documents FOR SELECT
  USING (
    client_visible = true
    AND entity_id = (
      SELECT entity_id FROM profiles WHERE id = auth.uid() AND role = 'client'
    )
    AND entity_type = (
      SELECT client_type FROM profiles WHERE id = auth.uid() AND role = 'client'
    )
  );

CREATE POLICY "client_upload_documents" ON documents FOR INSERT
  WITH CHECK (
    entity_id = (
      SELECT entity_id FROM profiles WHERE id = auth.uid() AND role = 'client'
    )
    AND client_visible = true
  );

-- ============================================================
-- QUOTES — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON quotes FOR ALL
  USING (is_admin());

-- ============================================================
-- TASKS — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON tasks FOR ALL
  USING (is_admin());

-- ============================================================
-- ATS APPLICATIONS — admin uniquement
-- ============================================================
CREATE POLICY "admin_full_access" ON ats_applications FOR ALL
  USING (is_admin());

-- ============================================================
-- AVAILABILITY SLOTS
-- ============================================================
CREATE POLICY "admin_full_access" ON availability_slots FOR ALL
  USING (is_admin());

CREATE POLICY "availability_public_read" ON availability_slots FOR SELECT
  USING (is_active = true);
