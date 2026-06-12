// netlify/functions/_supabase.js
// Shared server-side Supabase client (service-role key — NEVER expose to the browser).
// Used by the serverless functions only. The service-role key lives in Netlify
// environment variables, not in any client code.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Surface a clear error at cold-start rather than a cryptic null later.
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
}

// Service-role client bypasses Row Level Security — appropriate here because
// these functions are the trusted server boundary. Keep this key secret.
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Bucket that stores applicant audio/video responses. Private by default.
const MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'applicant-media';

// Standard JSON response helper with permissive-but-scoped CORS.
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      // The site and the functions share an origin on Netlify, so CORS is
      // mostly a non-issue, but these make local dev and previews painless.
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

module.exports = { admin, MEDIA_BUCKET, json };
