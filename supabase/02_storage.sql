-- ════════════════════════════════════════════════════════════════
--  RWI — Supabase Storage setup
--  Run AFTER 01_schema.sql.
--
--  Two buckets:
--    applicant-media : PRIVATE. Holds applicant audio/video responses.
--                      Only the service role (functions) reads/writes.
--    site-media      : PUBLIC (optional). For future site-hosted video that
--                      should play openly. Anyone can read; only service
--                      role writes.
-- ════════════════════════════════════════════════════════════════

-- ── Private applicant media bucket ──────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'applicant-media',
  'applicant-media',
  false,                                   -- PRIVATE
  524288000,                               -- 500 MB per object (tune as needed)
  array[
    'audio/webm','audio/mpeg','audio/mp4','audio/m4a','audio/ogg','audio/wav',
    'video/webm','video/mp4','video/quicktime'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage RLS policies for anon on this bucket => the browser cannot list,
-- read, or write it directly. Uploads happen via signed upload URLs minted by
-- the get-upload-url function (service role). Reads via get-media-url.

-- ── Public site media bucket (optional, future video hosting) ───
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,                                    -- PUBLIC read
  5368709120,                              -- 5 GB per object for large video
  array['video/mp4','video/webm','audio/mpeg','audio/mp4','image/png','image/jpeg','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket: allow anon to READ objects, but only service role writes.
drop policy if exists "site-media public read" on storage.objects;
create policy "site-media public read"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'site-media');

-- (No anon insert/update/delete policy => browser can't write to site-media.)
