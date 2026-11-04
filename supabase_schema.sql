-- ============================================================================
-- Prometheus Student Workspace - Supabase Postgres Schema & RLS Policies
-- Paste this into your Supabase SQL Editor to enable multi-device cloud sync.
-- ============================================================================

create table if not exists public.projects (
  id text primary key,
  user_id text not null,
  kind text not null default 'class', -- 'repo' | 'class'
  name text not null,
  code text default '',
  description text default '',
  language text default '',
  html_url text default '',
  color text default '#f59e0b',
  created_at timestamptz default now()
);

create table if not exists public.tasks (
  id text primary key,
  user_id text not null,
  project_id text default '',
  project_name text default 'General',
  title text not null,
  due_date text default '', -- YYYY-MM-DD
  due_time text default '11:59 PM',
  tag text default 'TASK',  -- LAB | EXAM | FEATURE | BUG | DEPLOY | TASK
  done boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.notes (
  id text primary key,
  user_id text not null,
  project_id text default '',
  title text not null,
  category text default 'NOTE',
  content text default '',
  updated_at timestamptz default now()
);

create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_tasks_user on public.tasks(user_id);
create index if not exists idx_notes_user on public.notes(user_id);

