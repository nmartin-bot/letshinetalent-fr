-- Devis polymorphe : rattachable à une entreprise, un candidat ou un apprenant
alter table quotes alter column company_id drop not null;
alter table quotes add column if not exists entity_type text;
alter table quotes add column if not exists entity_id   text;

-- Backfill des devis existants liés à une entreprise
update quotes
set entity_type = 'company', entity_id = company_id
where company_id is not null and entity_type is null;
