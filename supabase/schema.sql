-- Run in the Supabase SQL editor.
-- pastoral_updates is written by the cg-update leader form. If it already exists, skip it and
-- adjust src/lib/data.ts column names to match.
create table if not exists pastoral_updates (
  id bigint generated always as identity primary key,
  group_id text not null,
  submitted_at timestamptz not null default now(),
  health_rating int,
  help_needed text,
  missional_activity text,
  attrition_reasons text
);
create index if not exists pastoral_updates_group_idx on pastoral_updates (group_id, submitted_at desc);

create table if not exists notes (
  id bigint generated always as identity primary key,
  group_id text not null,
  date date not null default current_date,
  type text not null check (type in ('Call','Visit','Support Request','Update')),
  author text not null,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists notes_group_idx on notes (group_id, date desc);

-- Only the server (service role key) touches these. Lock out the public anon key.
alter table notes enable row level security;
alter table pastoral_updates enable row level security;

-- Phase 2 (not built): join_requests from the Group Finder map, for interest-vs-capacity.

-- Attendance takes ~10s to compute from CCB, so the dashboard stores the result here.
create table if not exists attendance_cache (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table attendance_cache enable row level security;
