-- Mise à jour de delete_entity_full : supprime aussi interactions, appointments, tasks
CREATE OR REPLACE FUNCTION delete_entity_full(p_entity_type text, p_entity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_user_id uuid;
BEGIN
  -- Récupérer l'email de l'entité
  IF p_entity_type = 'candidate' THEN
    SELECT email INTO v_email FROM candidates WHERE id = p_entity_id;
  ELSIF p_entity_type = 'learner' THEN
    SELECT email INTO v_email FROM learners WHERE id = p_entity_id;
  ELSIF p_entity_type = 'company' THEN
    SELECT email INTO v_email FROM companies WHERE id = p_entity_id;
  END IF;

  -- Supprimer les données liées via entity_type/entity_id (pas de FK possible sur polymorphique)
  DELETE FROM interactions WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
  DELETE FROM appointments WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
  DELETE FROM tasks       WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
  DELETE FROM documents   WHERE entity_type = p_entity_type AND entity_id = p_entity_id;

  -- Supprimer l'entité (les FK ON DELETE CASCADE gèrent le reste : cv_versions, coaching_sessions, ats_applications, etc.)
  IF p_entity_type = 'candidate' THEN
    DELETE FROM candidates WHERE id = p_entity_id;
  ELSIF p_entity_type = 'learner' THEN
    DELETE FROM learners WHERE id = p_entity_id;
  ELSIF p_entity_type = 'company' THEN
    DELETE FROM companies WHERE id = p_entity_id;
  END IF;

  -- Supprimer l'auth user si existe (cascade sur profiles)
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    IF v_user_id IS NOT NULL THEN
      DELETE FROM auth.users WHERE id = v_user_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION delete_entity_full(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_entity_full(text, uuid) TO authenticated;
