-- Documents partagés : entity_id nullable pour les docs de groupe ou globaux
-- entity_type='candidate', entity_id=null  → tous les candidats
-- entity_type='learner',   entity_id=null  → tous les apprenants
-- entity_type='global',    entity_id=null  → tout le monde
alter table documents alter column entity_id drop not null;
