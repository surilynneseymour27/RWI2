// netlify/functions/get-upload-url.js
// Mints a short-lived signed upload URL so the browser can PUT an audio/video
// blob straight into the PRIVATE Supabase Storage bucket — without ever seeing
// the service-role key.
//
// Front-end contract (from index.html):
//   POST /api/get-upload-url  { kind: 'audio'|'video', ext: string, questionId: string }
//   -> 200 { signedUrl, path }

const { admin, MEDIA_BUCKET, json } = require('./_supabase');
const crypto = require('crypto');

const ALLOWED_KINDS = new Set(['audio', 'video']);
// Whitelist extensions to avoid arbitrary path/types being written.
const ALLOWED_EXT = new Set(['mp3', 'm4a', 'ogg', 'wav', 'webm', 'mp4', 'mov']);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const kind = String(body.kind || '');
  const ext = String(body.ext || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const questionId = String(body.questionId || 'q').replace(/[^a-z0-9_-]/gi, '').slice(0, 24);

  if (!ALLOWED_KINDS.has(kind)) return json(400, { error: 'Invalid kind' });
  if (!ALLOWED_EXT.has(ext)) return json(400, { error: 'Invalid extension' });

  // Group all clips from one anonymous submission under a random submission id.
  // The browser doesn't have a submission id yet at upload time, so we scatter
  // by date + random token; save-submission records the exact paths returned.
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const token = crypto.randomBytes(8).toString('hex');
  const path = `${day}/${questionId}/${kind}-${token}.${ext}`;

  try {
    // createSignedUploadUrl returns a one-time token-bearing URL the browser
    // can PUT to. Expires quickly; good for a single upload.
    const { data, error } = await admin
      .storage
      .from(MEDIA_BUCKET)
      .createSignedUploadUrl(path);

    if (error) {
      console.error('createSignedUploadUrl error:', error);
      return json(500, { error: 'Could not create upload URL', detail: error.message });
    }

    return json(200, { signedUrl: data.signedUrl, path: data.path || path });
  } catch (e) {
    console.error('get-upload-url crash:', e);
    return json(500, { error: 'Server error', detail: e.message });
  }
};
