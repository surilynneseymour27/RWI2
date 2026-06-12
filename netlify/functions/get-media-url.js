// netlify/functions/get-media-url.js
// Returns a short-lived signed READ url for a media object in Storage.
// Useful for the future case where the site itself plays audio/video that
// lives in Supabase (e.g. hosting session videos) from a PRIVATE bucket.
//
//   GET /api/get-media-url?path=2026-06-11/q3/video-abc.mp4
//   -> 200 { url }
//
// If you instead make a bucket PUBLIC, you don't need this — you can use the
// public object URL directly. Keep this for private/gated media.

const { admin, MEDIA_BUCKET, json } = require('./_supabase');

const EXPIRES_SECONDS = 60 * 60; // 1 hour

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const path = event.queryStringParameters && event.queryStringParameters.path;
  if (!path) return json(400, { error: 'Missing path' });

  // Prevent traversal / absolute paths.
  if (path.includes('..') || path.startsWith('/')) {
    return json(400, { error: 'Invalid path' });
  }

  const bucket = (event.queryStringParameters && event.queryStringParameters.bucket) || MEDIA_BUCKET;

  try {
    const { data, error } = await admin
      .storage
      .from(bucket)
      .createSignedUrl(path, EXPIRES_SECONDS);

    if (error) {
      console.error('createSignedUrl error:', error);
      return json(500, { error: 'Could not sign media URL', detail: error.message });
    }
    return json(200, { url: data.signedUrl });
  } catch (e) {
    console.error('get-media-url crash:', e);
    return json(500, { error: 'Server error', detail: e.message });
  }
};
