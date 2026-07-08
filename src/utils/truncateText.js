// ============================================================
// truncateText - UTILITY FUNCTION
// ============================================================
// Cuts off long text after a certain character limit and adds "..."
// at the end, so it fits nicely in small UI spaces like product
// cards, where full product names/descriptions might be too long.

const truncateText = (text, maxLength = 50) => {
  // Guard clause: if no text is passed, return an empty string
  if (!text) return "";

  // If the text is already short enough (within the limit),
  // just return it as-is — no need to truncate
  if (text.length <= maxLength) return text;

  // Otherwise, cut the text down to maxLength characters
  // (text.slice(0, maxLength) grabs characters from index 0 up to maxLength)
  // and append "..." to visually indicate that the text was cut off
  return text.slice(0, maxLength) + "...";
};

// Exporting this function so it can be imported and used
// anywhere text needs to be truncated, e.g.:
// truncateText("A very long product description here...", 20)
// -> "A very long product ..."
export default truncateText;
