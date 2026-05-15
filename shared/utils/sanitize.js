export function sanitizeText(input) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;"
  };

  return String(input)
    .replace(/[&<>"']/g, (ch) => map[ch] || ch)
    .trim();
}
