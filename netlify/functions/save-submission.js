// netlify/functions/save-submission.js
// Inserts one applicant submission as a row in the `submissions` table.
// Media itself already lives in Storage; here we record the text answers,
// the storage paths, and the consent flags.
//
// Front-end contract (from index.html):
//   POST /api/save-submission
//   { answers: { q0: { text?, audioPaths?:[], videoPaths?:[] }, ... },
//     consent: { practice:bool, store:bool, anonymous:true } }
//   -> 200 { ok: true, id }

const { admin, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const answers = body.answers && typeof body.answers === 'object' ? body.answers : null;
  const consent = body.consent && typeof body.consent === 'object' ? body.consent : {};

  if (!answers) return json(400, { error: 'Missing answers' });

  // Light validation / normalization. We keep the whole answers object as JSONB
  // so the question set can evolve without a schema migration, but we also
  // hoist a few useful columns for easy querying/exports.
  const questionCount = Object.keys(answers).length;

  // Collect every media path referenced, so an admin can sweep storage later.
  const mediaPaths = [];
  for (const k of Object.keys(answers)) {
    const a = answers[k] || {};
    (a.audioPaths || []).forEach((p) => mediaPaths.push(p));
    (a.videoPaths || []).forEach((p) => mediaPaths.push(p));
  }

  const row = {
    answers,                                  // full JSONB blob
    consent_practice: !!consent.practice,
    consent_store: !!consent.store,
    anonymous: consent.anonymous !== false,   // defaults true
    question_count: questionCount,
    media_paths: mediaPaths,                  // text[] for convenience
    // A couple of low-sensitivity request signals for spam triage.
    user_agent: (event.headers['user-agent'] || '').slice(0, 300),
  };

  try {
    const { data, error } = await admin
      .from('submissions')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error('insert submission error:', error);
      return json(500, { error: 'Could not save submission', detail: error.message });
    }

    return json(200, { ok: true, id: data.id });
  } catch (e) {
    console.error('save-submission crash:', e);
    return json(500, { error: 'Server error', detail: e.message });
  }
};
