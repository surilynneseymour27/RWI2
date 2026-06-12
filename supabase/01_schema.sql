-- ════════════════════════════════════════════════════════════════
--  RWI — Supabase schema
--  Run this in the Supabase SQL Editor (or via the CLI migration).
--  Creates: submissions table, content table, RLS policies, indexes.
--  Storage buckets are created separately (see 02_storage.sql).
-- ════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- for gen_random_uuid()

-- ── Applicant submissions ───────────────────────────────────────
-- One row per completed application. Text answers + storage paths live
-- in `answers` (JSONB); a few columns are hoisted for easy querying.
create table if not exists public.submissions (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  answers           jsonb not null,           -- { q0:{text,audioPaths[],videoPaths[]}, ... }
  media_paths       text[] not null default '{}',
  question_count    int  not null default 0,
  consent_practice  boolean not null default false,
  consent_store     boolean not null default false,
  anonymous         boolean not null default true,
  user_agent        text,
  -- Soft workflow fields for whoever reviews applications:
  status            text not null default 'new'   -- new | reviewing | accepted | declined
);

create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);
create index if not exists submissions_status_idx
  on public.submissions (status);

-- ── Editable site content ───────────────────────────────────────
-- Optional: lets you edit apply-section copy without redeploying.
-- `value` is JSONB so a key can hold a string, list, or structured block.
create table if not exists public.content (
  key         text primary key,            -- e.g. 'apply_intro', 'apply_questions'
  value       jsonb not null,
  published   boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- Keep updated_at fresh on content edits.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists content_touch on public.content;
create trigger content_touch
  before update on public.content
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════
--  Row Level Security
--  The serverless functions use the SERVICE ROLE key, which bypasses
--  RLS. So we lock these tables down to the public/anon role entirely:
--  no direct browser reads or writes. All access goes through functions.
-- ════════════════════════════════════════════════════════════════

alter table public.submissions enable row level security;
alter table public.content     enable row level security;

-- No anon/public policies on submissions => browser cannot read or write it
-- directly. (Service role bypasses RLS, so the functions still work.)

-- Content is published copy, safe to read. If you'd rather serve it only
-- through the get-content function, delete this policy.
drop policy if exists "content public read" on public.content;
create policy "content public read"
  on public.content
  for select
  to anon
  using (published = true);

-- ── Notes ───────────────────────────────────────────────────────
-- • To review applications: use the Supabase Table Editor, or build an
--   authenticated admin view. Never expose the service-role key client-side.
-- • To export: select id, created_at, answers, media_paths from submissions.
