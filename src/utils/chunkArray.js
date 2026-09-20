// ============================================================
// CHUNK ARRAY
// ============================================================
// Splits an array into consecutive groups of at most `size` items.
//
// The admin bulk-action endpoints (bulk delete, bulk status update,
// bulk QR approve/reject) accept a maximum of 100 ids per request.
// When an admin selects more rows than that, the selected ids are
// split into fixed-size batches with this helper, and one request is
// sent per batch instead of a single oversized request.
const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export default chunkArray;
