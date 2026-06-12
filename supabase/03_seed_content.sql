-- ════════════════════════════════════════════════════════════════
--  RWI — optional seed data for the `content` table
--  Edit these rows anytime in the Supabase Table Editor; the site can
--  hydrate elements marked data-content="<key>" from get-content.
--  This is OPTIONAL — the site works fully with text baked into index.html.
-- ════════════════════════════════════════════════════════════════

insert into public.content (key, value, published) values
  ('apply_intro',
   '"Answer from a place of presence. You can write, record audio, or record video for any question."'::jsonb,
   true),
  ('apply_consent_practice',
   '"I understand this is a practice space and my responses are held with care."'::jsonb,
   true),
  ('apply_consent_store',
   '"I consent to my responses being stored securely for review by the facilitators."'::jsonb,
   true)
on conflict (key) do update
  set value = excluded.value,
      published = excluded.published;
