// ============================================================
// generateSku — SKU AUTO-GENERATION UTILITY
// ============================================================
// Builds a readable, reasonably unique SKU from a product's name and
// category, e.g. "FUR-OFF-8K2P" for an "Office Chair" in "Furniture".
//
// This is a CLIENT-SIDE convenience generator only — it does not
// guarantee global uniqueness on its own (two admins could still
// generate the same random suffix at the same moment, in theory).
// That's why this is always paired with real backend validation: if
// the generated (or manually typed) SKU collides with an existing
// product, the backend rejects it and the form surfaces that error
// next to the SKU field — see ProductAdd.jsx / ProductEdit.jsx.

// Strips a string down to only uppercase letters/numbers and trims it
// to the requested length — used to build short prefix chunks like
// "FUR" from "Furniture" or "OFF" from "Office Chair".
const slugPart = (text, length) => {
  return (text || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // remove spaces, punctuation, symbols
    .slice(0, length);
};

// Generates one SKU string from a product name and (optional) category label.
export const generateSku = (name, categoryLabel) => {
  const categoryPart = slugPart(categoryLabel, 3) || "GEN";
  // "GEN" (generic) fallback — used when no category has been picked yet

  const namePart = slugPart(name, 3) || "PRD";
  // "PRD" (product) fallback — used when the name field is still empty

  // Random 4-character base36 suffix (digits + letters) — keeps the
  // SKU short while making an accidental collision unlikely. Base36
  // gives 36^4 (~1.6 million) possible suffixes per name/category pair.
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `${categoryPart}-${namePart}-${randomPart}`;
};

export default generateSku;
