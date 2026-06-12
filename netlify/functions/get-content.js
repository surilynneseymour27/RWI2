// netlify/functions/get-content.js
// Returns editable site copy (e.g. apply-section text) from the `content` table.
// Lets you change wording in Supabase without redeploying the site.
//
//   GET /api/get-content            -> all published content keys
//   GET /api/get-content?key=apply  -> a single key
//
// The front-end can fetch this on load and hydrate any element marked with
// data-content="<key>".

const { admin, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const key = (event.queryStringParameters && event.queryStringParameters.key) || null;

  try {
    let query = admin.from('content').select('key, value, updated_at').eq('published', true);
    if (key) query = query.eq('key', key);

    const { data, error } = await query;
    if (error) {
      console.error('get-content error:', error);
      return json(500, { error: 'Could not load content', detail: error.message });
    }

    // Return as a { key: value } map for easy client hydration.
    const map = {};
    (data || []).forEach((r) => { map[r.key] = r.value; });
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
        // Cache content briefly at the edge; edits show up within a minute.
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
      body: JSON.stringify(map),
    };
  } catch (e) {
    console.error('get-content crash:', e);
    return json(500, { error: 'Server error', detail: e.message });
  }
};
