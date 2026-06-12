// public/content-hydrate.js  (OPTIONAL)
// Drop-in: hydrates any element marked  data-content="<key>"  with editable
// copy stored in Supabase (via the get-content function). Include with:
//   <script src="/content-hydrate.js" defer></script>
// and tag elements like:
//   <p data-content="apply_intro">fallback text baked into HTML…</p>
//
// If you never use editable content, you can ignore this file entirely —
// the site works with text baked into index.html.

(async function () {
  const nodes = document.querySelectorAll('[data-content]');
  if (!nodes.length) return;
  try {
    const res = await fetch('/api/get-content');
    if (!res.ok) return;                 // fall back to baked-in text
    const map = await res.json();
    nodes.forEach((el) => {
      const key = el.getAttribute('data-content');
      const val = map[key];
      if (typeof val === 'string') el.textContent = val;
      // If a value is structured (array/object), handle it here as needed.
    });
  } catch (_) {
    /* network error — keep the baked-in fallback text */
  }
})();
