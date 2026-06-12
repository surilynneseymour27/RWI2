# Deploy Guide — RWI Site (Netlify + Supabase)

Follow these in order. Estimated time: ~30 minutes the first time.
You need: a GitHub account, a Netlify account, a Supabase account. All have free tiers.

---

## 1. Set up Supabase (the backend)

1. Go to **app.supabase.com** → **New project**. Pick a name, a strong database
   password, and a region close to your applicants. Wait for it to provision.

2. Open **SQL Editor** → **New query**. Run each file from the `supabase/` folder
   **in order**, pasting the contents and clicking **Run**:
   - `01_schema.sql`  → creates the `submissions` and `content` tables + security.
   - `02_storage.sql` → creates the `applicant-media` (private) and `site-media`
     (public) buckets.
   - `03_seed_content.sql` → optional starter copy. Skip if you don't want editable text.

3. Grab your keys: **Project Settings → API**. You'll need:
   - **Project URL** (e.g. `https://abcd.supabase.co`)
   - **service_role key** (under "Project API keys" — the secret one, *not* anon).

   > ⚠️ The service_role key is powerful and secret. It goes in Netlify env vars
   > only. Never put it in the HTML or commit it.

4. (Optional) Confirm buckets exist: **Storage** → you should see `applicant-media`
   and `site-media`.

---

## 2. Put the code on GitHub

1. Create a new **private** GitHub repo (e.g. `rwi-site`).
2. Push this folder's contents to it:

   ```bash
   cd rwi-deploy
   git init
   git add .
   git commit -m "RWI site + deploy system"
   git branch -M main
   git remote add origin https://github.com/<you>/rwi-site.git
   git push -u origin main
   ```

   `.gitignore` already excludes `.env` and `node_modules`, so no secrets ship.

---

## 3. Connect Netlify (the hosting)

1. Go to **app.netlify.com** → **Add new site → Import an existing project** →
   pick GitHub → choose your `rwi-site` repo.

2. Build settings (Netlify reads most of this from `netlify.toml`, but confirm):
   - **Build command:** *(leave empty)* — there's no build step.
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`

3. Add environment variables: **Site settings → Environment variables → Add**.
   Use the values from `.env.example`:

   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | your project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role key |
   | `SUPABASE_MEDIA_BUCKET` | `applicant-media` |
   | `ALLOWED_ORIGIN` | your Netlify site URL (after first deploy) |

4. Click **Deploy site**. Netlify installs `@supabase/supabase-js` for the functions,
   publishes `public/`, and wires up `/api/*` routes from `netlify.toml`.

5. Once live, copy your site URL (e.g. `https://reshaping-xyz.netlify.app`), set it as
   `ALLOWED_ORIGIN`, and redeploy (**Deploys → Trigger deploy**) to scope CORS.

---

## 4. Test the full flow

1. Open the live site → **Apply to RWI**.
2. Answer one question by **writing**, one with **audio**, one with **video**.
3. Submit. You should see the thank-you state.
4. In Supabase:
   - **Table Editor → submissions** → your row is there, with text + `media_paths`.
   - **Storage → applicant-media** → your audio/video objects are there.

If submit fails, open the browser console and the **Netlify → Functions → logs**.
Most issues are a missing/typo'd env var or the SQL not having been run.

---

## 5. Day-to-day

- **Change site text/questions:** edit `public/index.html`, commit & push → auto-deploys.
- **Review applications:** Supabase **Table Editor → submissions**.
- **Export everything (with media):**

  ```bash
  npm install
  SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/export-submissions.js --media
  ```

- **Custom domain:** Netlify → **Domain settings** → add your domain, follow DNS steps.

---

## 6. Local development (optional)

```bash
npm install
cp .env.example .env     # fill in your values
npm run dev              # netlify dev → serves site + functions at localhost:8888
```

`netlify dev` runs the functions locally so you can test uploads end-to-end before
deploying.

---

## Future: hosting site videos in Supabase

When you want the site itself to play videos you host:

- **Public videos:** upload to the **`site-media`** bucket (Storage → Upload). Use the
  object's **public URL** directly in an `<video src=…>`.
- **Private/gated videos:** upload to a private bucket and fetch a signed URL from
  `/api/get-media-url?path=<object path>` before playback.

No architecture change needed — the buckets and the read function are already in place.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|--------|--------------|-----|
| "Could not get upload URL" | env vars missing/typo | Recheck Netlify env vars; redeploy |
| Upload 403 / fails | bucket not created | Re-run `02_storage.sql` |
| Save fails | `submissions` table missing | Re-run `01_schema.sql` |
| CORS error in console | `ALLOWED_ORIGIN` wrong | Set it to your exact site URL |
| Functions 404 | publish/functions dir wrong | Confirm `netlify.toml` settings |

---

## 7. Social share card (link preview)

The site includes a share card — a white background with the black RWI wheel —
shown when someone pastes your link. It lives at `public/og-card.png` and is
referenced by the Open Graph / Twitter meta tags in `index.html`.

**One important step after you have your final domain:** most platforms (iMessage,
Facebook, LinkedIn) need an ABSOLUTE image URL. Edit the two image meta tags in
`public/index.html` to use your full domain:

```html
<meta property="og:image" content="https://YOUR-DOMAIN/og-card.png">
<meta name="twitter:image" content="https://YOUR-DOMAIN/og-card.png">
```

Redeploy, then force-refresh the preview cache by pasting your URL into a platform
debugger (e.g. Facebook Sharing Debugger, LinkedIn Post Inspector) and re-scraping.

Note: link previews are always a STATIC image — the rotating wheel animation only
plays live on the page, not in shared link previews.
