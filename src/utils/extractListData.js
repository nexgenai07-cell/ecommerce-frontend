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
