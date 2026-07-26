-- Table to store OAuth integration tokens
create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique, -- 'google_calendar'
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  email text, -- connected Google account email
  connected_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Only admin users can access this table
alter table integrations enable row level security;

create policy "Admin only" on integrations
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
