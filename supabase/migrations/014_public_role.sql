-- Add 'public' role
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'client', 'public'));

-- Auto-create profile with 'public' role on first magic link signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, created_at)
  values (new.id, 'public', now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- CV documents
create table if not exists cv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Mon CV',
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table cv_documents enable row level security;
create policy "own_cv" on cv_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cover letters
create table if not exists cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Ma lettre',
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table cover_letters enable row level security;
create policy "own_letter" on cover_letters for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
