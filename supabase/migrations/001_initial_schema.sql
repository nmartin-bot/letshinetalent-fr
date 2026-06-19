-- ============================================================
-- Migration 001 — Schéma initial CRM Coach Emploi
-- ============================================================

-- Extension uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extension de auth.users)
-- ============================================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'client')),
  client_type text CHECK (client_type IN ('company', 'candidate', 'learner')),
  entity_id uuid,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Trigger pour créer automatiquement un profil à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  siret text,
  sector text,
  collective_agreement text,
  headcount int,
  address text,
  city text,
  postal_code text,
  phone text,
  email text,
  website text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text,
  email text,
  phone text,
  is_main_contact boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CANDIDATES
-- ============================================================
CREATE TABLE candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  current_situation text,
  objective text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- LEARNERS
-- ============================================================
CREATE TABLE learners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  function text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INTERACTIONS (polymorphique)
-- ============================================================
CREATE TABLE interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'candidate', 'learner')),
  entity_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'rdv')),
  channel text,
  summary text NOT NULL,
  author_id uuid REFERENCES profiles(id),
  occurred_at timestamptz DEFAULT now()
);

CREATE INDEX idx_interactions_entity ON interactions (entity_type, entity_id);

-- ============================================================
-- APPOINTMENTS (polymorphique)
-- ============================================================
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'candidate', 'learner')),
  entity_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('coaching_1', 'coaching_2', 'coaching_3', 'training', 'company', 'other')),
  status text DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'done')),
  starts_at timestamptz NOT NULL,
  duration_minutes int DEFAULT 60,
  location text,
  notes text,
  google_event_id text,
  created_by uuid REFERENCES profiles(id)
);

CREATE INDEX idx_appointments_entity ON appointments (entity_type, entity_id);
CREATE INDEX idx_appointments_starts_at ON appointments (starts_at);

-- ============================================================
-- COACHING SESSIONS
-- ============================================================
CREATE TABLE coaching_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  session_number int NOT NULL CHECK (session_number IN (1, 2, 3)),
  type text NOT NULL CHECK (type IN ('cv_analysis', 'interview_sim', 'final_review')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  notes text,
  evaluation_grid jsonb,
  score int,
  created_at timestamptz DEFAULT now(),
  UNIQUE (candidate_id, session_number)
);

-- ============================================================
-- CV VERSIONS
-- ============================================================
CREATE TABLE cv_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  file_url text NOT NULL,
  score int,
  analysis_result jsonb,
  stage text CHECK (stage IN ('initial', 'revised', 'final')),
  analyzed_at timestamptz,
  UNIQUE (candidate_id, version_number)
);

-- ============================================================
-- TRAINING COURSES
-- ============================================================
CREATE TABLE training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  title text NOT NULL,
  type text,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed')),
  start_date date,
  end_date date,
  total_hours int,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TRAINING SESSIONS
-- ============================================================
CREATE TABLE training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES training_courses(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  duration_hours int,
  location text,
  notes text
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES training_sessions(id) ON DELETE CASCADE,
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  present boolean DEFAULT false,
  justification text,
  UNIQUE (session_id, learner_id)
);

-- ============================================================
-- EVALUATIONS
-- ============================================================
CREATE TABLE evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  course_id uuid REFERENCES training_courses(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('initial', 'mid', 'final')),
  score int,
  feedback text,
  evaluated_at timestamptz DEFAULT now()
);

-- ============================================================
-- DOCUMENTS (polymorphique)
-- ============================================================
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'candidate', 'learner', 'course')),
  entity_id uuid NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  mime_type text,
  file_size int,
  category text CHECK (category IN ('cv', 'lettre', 'contrat', 'convention', 'cr', 'support', 'attestation', 'autre')),
  client_visible boolean DEFAULT false,
  uploaded_by uuid REFERENCES profiles(id),
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_documents_entity ON documents (entity_type, entity_id);

-- ============================================================
-- QUOTES
-- ============================================================
CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  reference text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'refused')),
  amount_ht decimal,
  amount_ttc decimal,
  description text,
  valid_until date,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TASKS (polymorphique)
-- ============================================================
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'candidate', 'learner')),
  entity_id uuid NOT NULL,
  title text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  completed boolean DEFAULT false,
  due_date date,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tasks_entity ON tasks (entity_type, entity_id);

-- ============================================================
-- ATS APPLICATIONS
-- ============================================================
CREATE TABLE ats_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  position text,
  source text DEFAULT 'website' CHECK (source IN ('website', 'linkedin', 'referral', 'manual', 'other')),
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'interview', 'accepted', 'refused')),
  candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL,
  cv_url text,
  cover_letter_url text,
  notes text,
  applied_at timestamptz DEFAULT now()
);

-- ============================================================
-- AVAILABILITY SLOTS
-- ============================================================
CREATE TABLE availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true
);
