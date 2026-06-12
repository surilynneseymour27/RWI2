# Reshaping White Identity — Site & Deploy System

A complete deploy package for the RWI retreat site.

- **Front-end:** one self-contained `public/index.html` (HTML/CSS/JS, images embedded).
- **Hosting:** Netlify (static + serverless functions).
- **Backend:** Supabase (Storage for audio/video, Postgres for submissions and editable content).

The apply section lets people answer each question by **writing, recording audio,
or recording video**. Media is uploaded straight to a **private Supabase Storage
bucket** via signed URLs; each application is saved as a row in the `submissions`
table. No applicant media or data is ever exposed publicly.

---

## How it fits together

```
 Browser (index.html)
   │
   │  1. POST /api/get-upload-url   ──► Netlify Function ──► Supabase: mint signed upload URL
   │  2. PUT  <signed url>          ──────────────────────► Supabase Storage (private bucket)
   │  3. POST /api/save-submission  ──► Netlify Function ──► Supabase: insert submissions row
   │
   └─ (optional) GET /api/get-content ─► Netlify Function ─► Supabase: editable copy
      (optional) GET /api/get-media-url ► signed READ url for private media (future video)
```

- The **service-role key** lives only in Netlify environment variables and is used
  only inside the functions. It is never sent to the browser.
- The browser only ever receives **short-lived signed URLs** scoped to a single object.

---

## Repository layout

```
rwi-deploy/
├─ public/
│  ├─ index.html              ← the site
│  └─ content-hydrate.js      ← optional: pull editable copy from Supabase
├─ netlify/
│  └─ functions/
│     ├─ _supabase.js         ← shared admin client + helpers
│     ├─ get-upload-url.js    ← mint signed upload URL (audio/video)
│     ├─ save-submission.js   ← insert a submission row
│     ├─ get-content.js       ← (optional) serve editable copy
│     └─ get-media-url.js     ← (optional) signed read URL for private media
├─ supabase/
│  ├─ 01_schema.sql           ← tables, RLS, indexes
│  ├─ 02_storage.sql          ← buckets + storage policies
│  └─ 03_seed_content.sql     ← (optional) seed editable copy
├─ scripts/
│  └─ export-submissions.js   ← pull submissions (+ media) locally
├─ netlify.toml               ← build, function routing, headers
├─ package.json
├─ .env.example               ← env var template
└─ docs/
   └─ DEPLOY.md               ← step-by-step setup (start here)
```

---

## Quick start

1. **Supabase:** create a project, run the three SQL files in `supabase/`.
2. **Netlify:** connect this repo, set the environment variables from `.env.example`.
3. **Deploy.** Netlify publishes `public/` and the functions automatically.

Full walkthrough: **[`docs/DEPLOY.md`](docs/DEPLOY.md)**.

---

## Editing content

- **Site copy / questions baked into `index.html`:** edit the file, redeploy
  (push to the connected branch — Netlify rebuilds automatically).
- **Editable copy via Supabase (optional):** edit rows in the `content` table;
  changes appear within ~1 minute, no redeploy. Requires tagging elements with
  `data-content="<key>"` and including `content-hydrate.js`.

## Hosting site videos later

Put public videos in the **`site-media`** bucket (public read). Reference them by
their public URL. For gated/private video, keep them in `applicant-media` (or a new
private bucket) and serve via `get-media-url`.

## Reviewing & exporting applications

- Browse in the Supabase **Table Editor** → `submissions`.
- Export locally:
  `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/export-submissions.js --media`

---

## Security notes

- Buckets are **private by default**; the browser never has blanket read/write access.
- Tables have **RLS on**; only the service role (functions) can read/write `submissions`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret — Netlify env vars only, never in client code.
- Set `ALLOWED_ORIGIN` to your domain in production to scope CORS.
