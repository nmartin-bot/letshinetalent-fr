alter table quotes add column if not exists document_id uuid references documents(id) on delete set null;
