-- Lien session courante sur les apprenants (contrôle l'accès portail)
alter table learners add column if not exists current_session_id uuid references training_sessions(id) on delete set null;

-- Lien entité sur les profils portail (rempli automatiquement au 1er login)
alter table profiles add column if not exists portal_entity_type text check (portal_entity_type in ('candidate', 'learner', 'company'));
alter table profiles add column if not exists portal_entity_id uuid;
