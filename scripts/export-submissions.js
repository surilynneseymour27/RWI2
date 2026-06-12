#!/usr/bin/env node
// scripts/export-submissions.js
// Pulls all applicant submissions into a local JSON file and (optionally)
// downloads their media from the private bucket. Run locally with your
// service-role key in the environment:
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/export-submissions.js
//
// Add --media to also download audio/video files into ./export/media.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'applicant-media';
const WITH_MEDIA = process.argv.includes('--media');

if (!URL || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const admin = createClient(URL, KEY, { auth: { persistSession: false } });

(async () => {
  const outDir = path.join(process.cwd(), 'export');
  fs.mkdirSync(outDir, { recursive: true });

  const { data, error } = await admin
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('Query failed:', error.message); process.exit(1); }

  const outFile = path.join(outDir, `submissions-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
  console.log(`Wrote ${data.length} submissions -> ${outFile}`);

  if (WITH_MEDIA) {
    const mediaDir = path.join(outDir, 'media');
    fs.mkdirSync(mediaDir, { recursive: true });
    let count = 0;
    for (const row of data) {
      for (const p of row.media_paths || []) {
        const { data: file, error: dlErr } = await admin.storage.from(BUCKET).download(p);
        if (dlErr) { console.warn('  skip', p, dlErr.message); continue; }
        const dest = path.join(mediaDir, p.replace(/[\/]/g, '__'));
        const buf = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(dest, buf);
        count++;
      }
    }
    console.log(`Downloaded ${count} media files -> ${mediaDir}`);
  }
})();
