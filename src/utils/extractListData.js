// ============================================================
// extractListData — DEFENSIVE API RESPONSE NORMALIZER
// ============================================================
// WHY THIS EXISTS (real-world context):
// Per API_Documentation_Final.pdf, several "list" endpoints
// (categories, notifications, returns, complaints) are documented
// to return a FLAT ARRAY, e.g. `[{...}, {...}]`.
//
// However, real Network-tab responses show some of these endpoints
// ACTUALLY return a DRF-PAGINATED OBJECT instead:
//   { count: 15, next: null, previous: null, results: [{...}, {...}] }
//
// This is a classic backend/documentation contract drift — very
// common in real production teams, especially once a backend adds
// global pagination middleware without updating every endpoint's
// docs. Rather than hardcode `.data.results` (which breaks the
// moment the backend is fixed to match the docs and returns a flat
// array again) or hardcode a flat array read (which breaks right
// now), this helper defensively supports BOTH shapes.
//
// USAGE:
//   const categories = extractListData(categoriesData); // categoriesData = axios response
//
// This is intentionally a TEMPORARY frontend safety net, not a
// permanent fix — the actual fix belongs on the backend (either the
// implementation should match the docs, or the docs should be
// updated to reflect real pagination). File a bug ticket either way;
// this normalizer just keeps the UI from crashing in the meantime.
const extractListData = (response) => {
  // The raw payload axios gives us, e.g. response.data
  const payload = response?.data;

  // Case 1: backend returned a flat array, exactly as documented
  // (e.g. products search results embedded array, or a fixed endpoint)
  if (Array.isArray(payload)) {
    return payload;
  }

  // Case 2: backend returned a DRF-paginated object instead
  // { count, next, previous, results: [...] }
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  // Case 3: data hasn't loaded yet, or shape is unrecognized —
  // fail safe with an empty array so `.map()`/`.filter()` never throw
  return [];
};

export default extractListData;
