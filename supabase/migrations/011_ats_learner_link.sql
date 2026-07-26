alter table ats_applications add column if not exists learner_id uuid references learners(id) on delete set null;
